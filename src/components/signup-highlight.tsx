import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSession } from "@/lib/session";

export async function SignupHighlight() {
  const session = await getSession();
  const cta = session
    ? { href: "/eventos", label: "Ver eventos" }
    : { href: "/cadastro", label: "Criar conta" };
  return (
    <section className="signup-highlight shell">
      <div className="signup-copy">
        <h2>Salve seus eventos favoritos</h2>
        <span>
          Crie uma conta para guardar eventos na sua lista e enviar sugestões
          para a agenda.
        </span>
        <Link href={cta.href}>
          {cta.label} <ArrowUpRight />
        </Link>
      </div>
      <div className="signup-visual">
        <div className="signup-photo">
          <Image
            src="/images/hero-gastronomia.webp"
            alt="Pessoas reunidas em um evento em Belém"
            fill
            sizes="420px"
          />
        </div>
      </div>
    </section>
  );
}
