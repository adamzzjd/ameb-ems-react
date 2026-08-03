import { supabase } from './client';

// All public-site and CMS images live in this bucket.
export const IMAGE_BUCKET = 'images';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024;

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

/** Upload an image to the public bucket and return its public URL. */
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

  const resized = await resizeImage(file, opts?.maxDim ?? 1600, opts?.quality ?? 0.82);
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

/** Delete an image from storage by its public URL (no-op for non-storage URLs). */
export async function deleteImageFromStorage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}
