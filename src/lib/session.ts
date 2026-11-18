import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Deduplica chamadas a auth() dentro da mesma requisição no servidor. */
export const getSession = cache(() => auth());

/** Garante que o usuário atual ainda possui papel ADMIN ativo no banco. */
export async function requireAdminUser() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Não autorizado");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Não autorizado");

  return user;
}

/** Protege Server Components da área /admin além do proxy.ts. */
export async function requireAdminPage(callbackUrl = "/admin") {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (user?.role !== "ADMIN") {
    redirect("/");
  }

  return user;
}
