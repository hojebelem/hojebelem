"use client";

import { useEffect, useRef } from "react";

/** Envia a mutação por POST automaticamente após o login, evitando escrita em GET. */
export function AutoFavoriteForm({
  action,
}: {
  action: () => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={action}>
      <button className="gradient-button" type="submit">
        Confirmar favorito
      </button>
    </form>
  );
}
