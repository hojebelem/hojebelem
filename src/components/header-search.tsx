"use client";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const outside = (e: MouseEvent) => {
      if (!form.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="header-search-wrap">
      <form
        ref={form}
        action="/eventos"
        role="search"
        className={`header-search${open ? " open" : ""}`}
      >
        <input
          ref={input}
          name="q"
          placeholder="Busque eventos, lugares..."
          aria-label="Pesquisar eventos"
          tabIndex={open ? 0 : -1}
        />
        {/* um botão só: fechado ele abre a caixa, aberto ele pesquisa */}
        <button
          type="submit"
          aria-label={open ? "Pesquisar" : "Abrir pesquisa"}
          aria-expanded={open}
          onClick={(e) => {
            if (!open) {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          <Search />
        </button>
      </form>
    </div>
  );
}
