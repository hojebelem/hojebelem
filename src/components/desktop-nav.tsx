"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/eventos", label: "Eventos" },
  { href: "/explorar", label: "Explorar" },
  { href: "/wishlist", label: "Favoritos" },
  { href: "/divulgar", label: "Divulgar" },
] as const;

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="desktop-nav" aria-label="Navegação principal">
      {links.map(({ href, label }) => {
        const active =
          pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
