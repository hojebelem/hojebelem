import { SubmitEventForm } from "@/components/submit-event-form";
import { getCategories } from "@/lib/data";
import { getSession } from "@/lib/session";
import Link from "next/link";

export const metadata = { title: "Divulgue seu evento" };

const FORM_ERRORS: Record<string, string> = {
  dados:
    "Confira os dados: descrição com 20+ caracteres, links completos (https://) e data válida.",
  datas: "A hora final precisa ser depois do início.",
  limite: "Muitos envios seguidos. Aguarde um pouco antes de enviar outro evento.",
};

export default async function SubmitEvent({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; enviado?: string }>;
}) {
  const [session, { erro, enviado }] = await Promise.all([
    getSession(),
    searchParams,
  ]);
  const categories = session?.user?.id ? await getCategories() : [];
  return (
    <div className="shell page-space">
      <div className="page-intro">
        <p>DIVULGAÇÃO</p>
        <h1>Divulgue seu evento</h1>
        <span>
          Envie os dados do seu evento. A equipe revisa antes de publicar.
        </span>
      </div>
      {!session?.user?.id ? (
        <>
          <p>Entre na sua conta para enviar um evento para revisão.</p>
          <Link
            className="gradient-button"
            href="/login?callbackUrl=/divulgar"
          >
            Entrar para divulgar
          </Link>
        </>
      ) : (
        <>
          {enviado && (
            <p className="form-success" role="status">
              Recebemos seu evento! Ele aparece no site depois da revisão da
              equipe.
            </p>
          )}
          {erro && FORM_ERRORS[erro] && (
            <p className="auth-error" role="alert">
              {FORM_ERRORS[erro]}
            </p>
          )}
          <SubmitEventForm categories={categories} />
        </>
      )}
    </div>
  );
}
