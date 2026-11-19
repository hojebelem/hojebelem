import Link from "next/link";
import { getSession } from "@/lib/session";
import { safeAvatarUrl } from "@/lib/validation";
import { Heart, UserRound } from "lucide-react";
import { DesktopNav } from "./desktop-nav";
import { Logo } from "./logo";
import { HeaderSearch } from "./header-search";

export async function Header() {
  const session = await getSession();
  const label = session?.user?.name || session?.user?.email;
  const avatarUrl = safeAvatarUrl(session?.user?.image);
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <DesktopNav />
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
              style={
                avatarUrl
                  ? { backgroundImage: `url("${avatarUrl}")` }
                  : undefined
              }
            >
              {avatarUrl ? null : label.charAt(0).toUpperCase()}
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
