import { supabase } from './client';

// ── Image hosting ────────────────────────────────────────────────────────────
// Images can be hosted on Cloudinary (recommended — CDN + automatic
// f_auto/q_auto optimization, zero Supabase egress) or Supabase Storage.
// Cloudinary is used automatically once these env vars are set:
//   VITE_CLOUDINARY_CLOUD_NAME      e.g. dabc12345
//   VITE_CLOUDINARY_UPLOAD_PRESET   the unsigned upload preset name
// Until then, uploads fall back to Supabase Storage.
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;
const CLOUDINARY_ENABLED = Boolean(CLOUD_NAME && UPLOAD_PRESET);

// All public-site and CMS images live in this bucket (Supabase fallback).
export const IMAGE_BUCKET = 'images';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024;

const CLOUDINARY_URL_RE = /res\.cloudinary\.com\/.*\/image\/upload\//;

/**
 * Downscale + compress an image client-side before upload so uploads stay
 * small (the free storage tier is limited). PNG is kept as PNG so transparent
 * logos keep working; everything else becomes JPEG. GIFs and oversized/odd
 * formats are passed through unchanged.
 */
async function resizeImage(file: File, maxDim: number, quality: number): Promise<File> {
  if (file.type === 'image/gif') return file;
  if (!ALLOWED_TYPES.includes(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < 2.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const isPng = file.type === 'image/png';
    const mime = isPng ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, mime, isPng ? undefined : quality)
    );
    if (!blob) return file;

    const ext = isPng ? 'png' : 'jpg';
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-${Date.now()}.${ext}`, { type: mime });
  } catch {
    return file;
  }
}

/**
 * Upload to Cloudinary via an unsigned upload preset (browser-safe — no API
 * secret needed). Returns the secure URL with automatic format + quality
 * optimization embedded, so every existing <img> tag serves WebP/AVIF at the
 * ideal quality with no further changes.
 */
async function uploadToCloudinary(file: File): Promise<{ url: string | null; error: Error | null }> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return { url: null, error: new Error('Cloudinary is not configured.') };
  }
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const data = await res.json() as { secure_url?: string; error?: { message?: string } };
    if (!res.ok || !data.secure_url) {
      return { url: null, error: new Error(data.error?.message || `Upload failed (${res.status}).`) };
    }
    const optimized = data.secure_url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
    return { url: optimized, error: null };
  } catch (e) {
    return { url: null, error: new Error(e instanceof Error ? e.message : 'Upload failed.') };
  }
}

/** Upload an image and return its public URL (Cloudinary first, Supabase fallback). */
export async function uploadImageToStorage(
  file: File,
  folder: string,
  opts?: { maxDim?: number; quality?: number }
): Promise<{ url: string | null; error: Error | null }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: null, error: new Error('Only JPG, PNG, WebP and GIF images are allowed.') };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: new Error('Image must be smaller than 8 MB.') };
  }

  // Downscale before upload either way (keeps uploads small and delivery fast).
  const resized = await resizeImage(file, opts?.maxDim ?? 1600, opts?.quality ?? 0.82);

  if (CLOUDINARY_ENABLED) {
    return uploadToCloudinary(resized);
  }

  const ext = resized.type === 'image/png' ? 'png' : resized.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, resized, {
    contentType: resized.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) return { url: null, error: new Error(error.message) };

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

/**
 * Delete an image by its public URL.
 * - Supabase storage URLs are removed from the bucket.
 * - Cloudinary URLs are left in place (unsigned presets can't delete — clean
 *   them up in the Cloudinary Media Library dashboard when needed).
 * - Anything else is a no-op (e.g. legacy base64 data).
 */
export async function deleteImageFromStorage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (CLOUDINARY_URL_RE.test(url)) return;
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}
