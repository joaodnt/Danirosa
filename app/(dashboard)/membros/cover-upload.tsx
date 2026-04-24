"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateCourseCover, removeCourseCover } from "./actions";
import { Camera, Loader2, Trash2 } from "lucide-react";

type Props = {
  courseId: string;
  slug: string;
  hasCover: boolean;
};

export function CoverUpload({ courseId, slug, hasCover }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${slug}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("course-covers")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: pub } = supabase.storage.from("course-covers").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const res = await updateCourseCover(courseId, publicUrl);
      if (res.error) throw new Error(res.error);

      startTransition(() => {
        // força re-render do server component
        window.location.reload();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
      setUploading(false);
    }
  }

  async function onRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remover capa atual?")) return;
    setUploading(true);
    const res = await removeCourseCover(courseId);
    if (res.error) {
      setError(res.error);
      setUploading(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onFileChange}
        className="hidden"
      />
      {hasCover && (
        <button
          type="button"
          onClick={onRemove}
          disabled={uploading}
          title="Remover capa"
          className="h-8 w-8 rounded-lg bg-brand-950/80 backdrop-blur ring-1 ring-brand-700 text-ink-200 hover:text-red-400 hover:bg-red-950/50 flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          fileRef.current?.click();
        }}
        disabled={uploading}
        title={hasCover ? "Trocar capa" : "Enviar capa"}
        className="h-8 rounded-lg bg-accent-gold text-brand-950 px-2.5 text-xs font-semibold flex items-center gap-1 hover:brightness-110 transition-all disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
        {hasCover ? "Trocar" : "Capa"}
      </button>
      {error && (
        <div className="absolute top-10 right-0 w-64 text-xs bg-red-950/90 border border-red-900 text-red-200 rounded-md px-2 py-1.5 shadow-xl">
          {error}
        </div>
      )}
    </div>
  );
}
