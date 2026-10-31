"use client";

import type { ReactNode } from "react";

const DEFAULT_MESSAGE = "Excluir este evento? Isso não pode ser desfeito.";

// vai dentro de um <form>: cancelar a confirmação impede o envio
export function AdminConfirmButton({
  children,
  message = DEFAULT_MESSAGE,
  className,
}: {
  children: ReactNode;
  message?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
