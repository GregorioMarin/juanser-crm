"use client";

import { useRef, useState } from "react";

const accept = "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

export function MultiFileInput({ name = "archivos", required = false }: { name?: string; required?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  function replaceFiles(next: File[]) {
    const transfer = new DataTransfer();
    next.forEach((file) => transfer.items.add(file));
    if (inputRef.current) inputRef.current.files = transfer.files;
    setFiles(next);
  }

  return (
    <div className="grid gap-3">
      <input ref={inputRef} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition file:mr-3 file:rounded file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:font-semibold focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" name={name} type="file" accept={accept} multiple required={required} onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
      {files.length > 0 ? (
        <ol className="grid gap-2" aria-label="Archivos seleccionados">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">{index + 1}. {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</span>
              <button type="button" onClick={() => replaceFiles(files.filter((_, itemIndex) => itemIndex !== index))} className="shrink-0 font-semibold text-rose-700 hover:text-rose-900">Eliminar</button>
            </li>
          ))}
        </ol>
      ) : <p className="text-xs text-neutral-500">Hasta 10 archivos, máximo 20 MB por archivo.</p>}
    </div>
  );
}