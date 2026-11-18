import { confirmFavoriteAction } from "@/app/actions";
import { AutoFavoriteForm } from "@/components/auto-favorite-form";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSafeLocalPath } from "@/lib/validation";
import { redirect } from "next/navigation";

// destino do login de quem favoritou sem estar logado: envia POST para salvar e voltar.
export default async function Favoritar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volta?: string }>;
}) {
  const [{ id }, { volta = "" }] = await Promise.all([params, searchParams]);
  // só caminhos do próprio site, para não virar redirecionamento aberto
  const destino = isSafeLocalPath(volta) ? volta : "/";
  const session = await getSession();
  if (!session?.user?.id) {
    const aqui = `/favoritar/${encodeURIComponent(id)}?volta=${encodeURIComponent(destino)}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(aqui)}`);
  }
  const event = await prisma.event.findFirst({
    where: { id, isPublished: true, rejectedAt: null },
    select: { id: true, title: true },
  });
  if (!event) redirect(destino);

  const action = confirmFavoriteAction.bind(null, event.id, destino);
  return (
    <div className="shell page-space status-page">
      <p className="eyebrow">FAVORITOS</p>
      <h1>Salvando {event.title}…</h1>
      <span>Se não redirecionar automaticamente, confirme abaixo.</span>
      <div className="status-actions">
        <AutoFavoriteForm action={action} />
      </div>
    </div>
  );
}
