"use client";

import { useCallback, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setPreview(null);
        onChange(null);
        return;
      }
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange(file);
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    handleFile(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-mono font-medium uppercase tracking-widest text-text-secondary">
        Product Image <span className="text-text-muted normal-case tracking-normal">(optional)</span>
      </label>

      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-sm border-2 border-dashed transition-all duration-200 overflow-hidden",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-border-strong",
          disabled && "opacity-50 cursor-not-allowed",
          preview ? "h-48" : "h-36"
        )}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Product preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-2 px-3 py-2 rounded-sm bg-destructive/90 text-white text-sm font-medium hover:bg-destructive transition-colors"
              >
                <X size={14} />
                Remove
              </button>
            </div>
          </>
        ) : (
          <label
            className={cn(
              "flex flex-col items-center justify-center w-full h-full cursor-pointer gap-3",
              disabled && "cursor-not-allowed"
            )}
          >
            <div className="w-10 h-10 rounded-sm bg-surface-2 border border-border flex items-center justify-center">
              {dragging ? (
                <Upload size={18} className="text-primary" />
              ) : (
                <ImageIcon size={18} className="text-text-muted" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-text-secondary">
                <span className="text-primary font-medium">Click to upload</span>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-text-muted mt-1">PNG, JPG, WEBP up to 5MB</p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleChange}
              disabled={disabled}
            />
          </label>
        )}
      </div>

      {value && (
        <p className="text-xs text-text-muted font-mono">
          {value.name} · {(value.size / 1024).toFixed(0)} KB
        </p>
      )}
    </div>
  );
}
