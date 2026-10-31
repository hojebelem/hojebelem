"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/eventos/novo", label: "Novo evento" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/", label: "Ver site" },
];

export function AdminNav() {
  const pathname = usePathname();
  // "Eventos" também vale para a edição, mas não para "Novo evento"
  const isActive = (href: string) => {
    if (href === "/") return false;
    if (href === "/admin") return pathname === href;
    if (href === "/admin/eventos")
      return pathname.startsWith(href) && !pathname.startsWith(`${href}/novo`);
    return pathname.startsWith(href);
  };
  return (
    <nav className="admin-nav shell" aria-label="Administração">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={isActive(href) ? "active" : undefined}
          aria-current={isActive(href) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
