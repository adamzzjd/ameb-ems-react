/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

import { useRef, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { deleteImageFromStorage, uploadImageToStorage } from '@/supabase/storage';

interface ImageUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder: string;
  maxDim?: number;
  label?: string;
  hint?: string;
  round?: boolean;
}

export function ImageUpload({ value, onChange, folder, maxDim, label = 'Image', hint, round = false }: ImageUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (value) await deleteImageFromStorage(value);

    setUploading(true);
    const { url, error } = await uploadImageToStorage(file, folder, maxDim ? { maxDim } : undefined);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';

    if (error || !url) {
      toast(error?.message || 'Upload failed.', true);
      return;
    }
    onChange(url);
    toast('✓ Image uploaded');
  };

  return (
    <div className="space-y-1.5">
      {label && <span className="text-xs font-medium text-text-secondary">{label}</span>}
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div
          className={`shrink-0 overflow-hidden bg-surface-warm border border-border flex items-center justify-center text-2xl ${
            round ? 'w-20 h-20 rounded-full' : 'w-32 h-24 rounded-xl'
          }`}
        >
          {uploading ? (
            <span className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
          ) : value ? (
            <img src={value} alt="" className={`w-full h-full object-cover ${round ? 'rounded-full' : ''}`} />
          ) : (
            <span className="opacity-40">🖼</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
          <label
            className={`inline-flex items-center gap-2 w-fit px-3 py-2 rounded-lg border border-border bg-surface text-xs font-semibold transition-colors ${
              uploading ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:border-primary hover:text-primary'
            }`}
          >
            {uploading ? 'Uploading…' : '⬆ Upload'}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFile}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => {
                void deleteImageFromStorage(value);
                onChange(null);
              }}
              className="text-xs text-error hover:underline cursor-pointer border-none bg-transparent text-left"
            >
              ✕ Remove
            </button>
          )}
          {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        </div>
      </div>
    </div>
  );
}
