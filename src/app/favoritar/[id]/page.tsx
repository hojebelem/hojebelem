import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// destino do login de quem favoritou sem estar logado: salva e volta para a página.
// É página (não route handler) para o redirect atualizar a barra de endereço.
export default async function Favoritar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ volta?: string }>;
}) {
  const [{ id }, { volta = "" }] = await Promise.all([params, searchParams]);
  // só caminhos do próprio site, para não virar redirecionamento aberto
  const destino = volta.startsWith("/") && !volta.startsWith("//") ? volta : "/";
  const session = await auth();
  if (!session?.user?.id) {
    const aqui = `/favoritar/${id}?volta=${encodeURIComponent(destino)}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(aqui)}`);
  }
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true },
  });
  if (event)
    await prisma.wishlist.createMany({
      data: [{ userId: session.user.id, eventId: event.id }],
      skipDuplicates: true,
    });
  redirect(destino);
}
