"use client";

import { useState } from "react";

export function AdminCoverPreview({ defaultValue }: { defaultValue: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [failedUrl, setFailedUrl] = useState("");
  const src = url.trim();
  return (
    <>
      <label>
        URL da imagem de capa
        <input
          type="text"
          name="coverImageUrl"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://... ou /images/..."
        />
      </label>
      {src && failedUrl !== src && (
        // <img> simples: a prévia aceita qualquer domínio, sem passar pelo otimizador
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="admin-cover-preview"
          src={src}
          alt="Prévia da capa"
          onError={() => setFailedUrl(src)}
        />
      )}
      {src && failedUrl === src && (
        <p className="admin-cover-error">Não foi possível carregar a imagem.</p>
      )}
    </>
  );
}
