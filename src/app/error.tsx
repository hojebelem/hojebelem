"use client";
import Link from "next/link";

// erro inesperado em qualquer página: mantém cabeçalho e rodapé do site
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <div className="shell page-space status-page">
      <p className="eyebrow">ALGO DEU ERRADO</p>
      <h1>Não conseguimos carregar esta página.</h1>
      <span>Tente de novo em alguns segundos.</span>
      <div className="status-actions">
        <button className="gradient-button" type="button" onClick={retry}>
          Tentar de novo
        </button>
        <Link className="secondary-button" href="/">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
