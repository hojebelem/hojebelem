import Link from "next/link";
import { Heart, UserRound } from "lucide-react";
import { Logo } from "./logo";
import { HeaderSearch } from "./header-search";

export function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Navegação principal">
          <Link href="/eventos">Eventos</Link>
          <Link href="/explorar">Explorar</Link>
          <Link href="/wishlist">Favoritos</Link>
        </nav>
        <div className="header-actions">
          <HeaderSearch />
          <Link href="/wishlist" aria-label="Favoritos">
            <Heart />
          </Link>
          <Link href="/perfil" aria-label="Perfil">
            <UserRound />
          </Link>
        </div>
      </div>
    </header>
  );
}
