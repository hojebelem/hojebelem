import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell page-space status-page">
      <p className="eyebrow">ERRO 404</p>
      <h1>Essa página não existe.</h1>
      <span>O link pode estar errado ou o evento pode ter saído do ar.</span>
      <div className="status-actions">
        <Link className="gradient-button" href="/eventos">
          Ver eventos
        </Link>
        <Link className="secondary-button" href="/">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
