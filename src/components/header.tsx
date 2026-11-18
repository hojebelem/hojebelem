import Link from "next/link";
import { getSession } from "@/lib/session";
import { Heart, UserRound } from "lucide-react";
import { Logo } from "./logo";
import { HeaderSearch } from "./header-search";

export async function Header() {
  const session = await getSession();
  const label = session?.user?.name || session?.user?.email;
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
          {label ? (
            <Link
              href="/perfil"
              className="header-user"
              aria-label={`Perfil de ${label}`}
            >
              {label.charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link href="/perfil" aria-label="Perfil">
              <UserRound />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
