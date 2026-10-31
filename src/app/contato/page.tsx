import Link from "next/link";

export const metadata = { title: "Contato" };

export default function Contact() {
  return (
    <article className="legal-page shell page-space">
      <p className="eyebrow">FALE COM A GENTE</p>
      <h1>Contato</h1>
      <section>
        <h2>Dúvidas, sugestões e correções</h2>
        <p>
          Viu uma informação errada em algum evento ou quer sugerir algo? Fale
          com a gente pelo Instagram{" "}
          <a
            href="https://www.instagram.com/hojebelem/"
            target="_blank"
            rel="noopener noreferrer"
          >
            @hojebelem
          </a>
          .
        </p>
        <h2>Organizadores</h2>
        <p>
          Para divulgar um evento, use a página{" "}
          <Link href="/divulgar">Divulgue seu evento</Link>. A equipe revisa
          antes de publicar.
        </p>
        <h2>Ingressos e reservas</h2>
        <p>
          A Hoje Belém não vende ingressos. Para compras, trocas e reembolsos,
          fale com o organizador pelo link do próprio evento.
        </p>
      </section>
    </article>
  );
}
