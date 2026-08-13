// ── Image hosting (Cloudinary only) ─────────────────────────────────────────
// All images — CMS content, gallery, team, news and employee photos — are
// hosted exclusively on Cloudinary: CDN delivery with automatic f_auto/q_auto
// optimization and zero Supabase egress. The database only ever stores the
// Cloudinary public URL (never image data).
//
// Required env vars:
//   VITE_CLOUDINARY_CLOUD_NAME      e.g. dabc12345
//   VITE_CLOUDINARY_UPLOAD_PRESET   the unsigned upload preset name
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Downscale + compress an image client-side before upload so uploads stay
 * small. PNG is kept as PNG so transparent logos keep working; everything
 * else becomes JPEG. GIFs and oversized/odd formats are passed through
 * unchanged.
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
    return { url: null, error: new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.') };
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

/**
 * Upload an image and return its public Cloudinary URL.
 * `folder` is kept for API compatibility with callers; with an unsigned
 * preset Cloudinary routes uploads into the preset's folder.
 */
export async function uploadImageToStorage(
  file: File,
  _folder: string,
  opts?: { maxDim?: number; quality?: number }
): Promise<{ url: string | null; error: Error | null }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: null, error: new Error('Only JPG, PNG, WebP and GIF images are allowed.') };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: new Error('Image must be smaller than 8 MB.') };
  }

  // Downscale before upload keeps uploads small and delivery fast.
  const resized = await resizeImage(file, opts?.maxDim ?? 1600, opts?.quality ?? 0.82);

  return uploadToCloudinary(resized);
}

// ── Document uploads (Cloudinary raw) ─────────────────────────────────────
// Scanned letters and certificates are stored as raw files on Cloudinary
// (same unsigned preset — it must allow non-image uploads).
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/webp',
];
const MAX_DOC_BYTES = 10 * 1024 * 1024;

/**
 * Upload a document (PDF, Office file, or image scan) to Cloudinary as a raw
 * file and return its public URL. The upload preset must be configured to
 * accept raw files.
 */
export async function uploadDocumentToStorage(file: File): Promise<{ url: string | null; error: Error | null }> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return { url: null, error: new Error('Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.') };
  }
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return { url: null, error: new Error('Only PDF, Word, Excel, PowerPoint and image files are allowed.') };
  }
  if (file.size > MAX_DOC_BYTES) {
    return { url: null, error: new Error('Document must be smaller than 10 MB.') };
  }
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
      method: 'POST',
      body: form,
    });
    const data = await res.json() as { secure_url?: string; error?: { message?: string } };
    if (!res.ok || !data.secure_url) {
      return { url: null, error: new Error(data.error?.message || `Upload failed (${res.status}).`) };
    }
    return { url: data.secure_url, error: null };
  } catch (e) {
    return { url: null, error: new Error(e instanceof Error ? e.message : 'Upload failed.') };
  }
}

/**
 * Delete an image by its public URL.
 *
 * Cloudinary is the only image host, and unsigned upload presets carry no
 * delete permission — so this is a no-op. Clean up unused assets in the
 * Cloudinary Media Library dashboard when needed.
 */
export async function deleteImageFromStorage(_url: string | null | undefined): Promise<void> {
  // No-op — see comment above.
}
