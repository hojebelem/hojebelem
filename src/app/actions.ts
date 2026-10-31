"use server";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath, updateTag } from "next/cache";
import { EVENTS_TAG } from "@/lib/data";
import { redirect } from "next/navigation";
import { z } from "zod";
import { saveProfileImage } from "@/lib/upload";
import { fromZonedTime } from "date-fns-tz";
import { TIMEZONE } from "@/lib/events";

// só caminhos do próprio site, para não virar redirecionamento aberto
function safeRedirect(value: FormDataEntryValue | null) {
  const to = typeof value === "string" ? value : "";
  return to.startsWith("/") && !to.startsWith("//") ? to : "/";
}

export async function loginAction(formData: FormData) {
  const to = safeRedirect(formData.get("callbackUrl"));
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: to,
    });
  } catch (error) {
    if (error instanceof AuthError)
      redirect(
        `/login?erro=credenciais&callbackUrl=${encodeURIComponent(to)}`,
      );
    throw error;
  }
}

export async function googleAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function registerAction(formData: FormData) {
  const parsed = z
    .object({
      name: z.string().trim().min(2),
      email: z.string().email(),
      password: z.string().min(8),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/cadastro?erro=dados");
  const data = parsed.data;
  if (await prisma.user.findUnique({ where: { email: data.email } }))
    redirect("/cadastro?erro=email");
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
    },
  });
  await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirectTo: "/",
  });
}

const eventSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(20),
  category: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().optional(),
  venueName: z.string().trim().min(2),
  address: z.string().trim().min(3),
  externalPurchaseLink: z.string().url(),
  socialLink: z.union([z.literal(""), z.string().url()]).optional(),
  coverImageUrl: z
    .union([z.literal(""), z.string().url(), z.string().startsWith("/")])
    .optional(),
  price: z.string().optional(),
  status: z.enum(["AUTOMATIC", "POSTPONED", "CANCELLED"]),
});

async function requireAdmin() {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN")
    throw new Error("Não autorizado");
  return session.user;
}

function parseEventForm(formData: FormData) {
  const data = eventSchema.parse(Object.fromEntries(formData));
  return {
    input: data,
    values: {
      title: data.title,
      description: data.description,
      // datetime-local não tem fuso: interpreta como horário de Belém, não do servidor
      startAt: fromZonedTime(data.startAt, TIMEZONE),
      endAt: data.endAt ? fromZonedTime(data.endAt, TIMEZONE) : null,
      venueName: data.venueName,
      address: data.address,
      externalPurchaseLink: data.externalPurchaseLink,
      socialLink: data.socialLink || null,
      coverImageUrl: data.coverImageUrl || "/images/hero-belem.webp",
      price: data.price ? Number(data.price) : null,
      statusOverride: data.status === "AUTOMATIC" ? null : data.status,
      isPublished: formData.get("published") === "on",
      isFeatured: formData.get("featured") === "on",
    },
  };
}

function revalidateEventPages(slug?: string) {
  // limpa o cache de eventos na hora, para o admin ver a mudança
  updateTag(EVENTS_TAG);
  revalidatePath("/");
  revalidatePath("/eventos");
  revalidatePath("/explorar");
  revalidatePath("/admin/eventos");
  if (slug) revalidatePath(`/eventos/${slug}`);
}

export async function createEventAction(formData: FormData) {
  const user = await requireAdmin();
  const { input, values } = parseEventForm(formData);
  const city = await prisma.city.findUniqueOrThrow({
    where: { slug: "belem" },
  });
  const slug = `${input.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
  await prisma.event.create({
    data: {
      ...values,
      slug,
      cityId: city.id,
      createdById: user.id,
      categories: { create: { categoryId: input.category } },
    },
  });
  revalidateEventPages(slug);
  redirect("/admin/eventos");
}

export async function updateEventAction(id: string, formData: FormData) {
  await requireAdmin();
  const { input, values } = parseEventForm(formData);
  const event = await prisma.event.update({
    where: { id },
    data: {
      ...values,
      reviewedAt: new Date(),
      categories: { deleteMany: {}, create: { categoryId: input.category } },
    },
  });
  revalidateEventPages(event.slug);
  redirect("/admin/eventos");
}

// updateMany: se outro admin já apagou o evento, não quebra a página
export async function approveEventAction(id: string) {
  await requireAdmin();
  await prisma.event.updateMany({
    where: { id },
    data: { isPublished: true, reviewedAt: new Date() },
  });
  revalidateEventPages();
}

export async function rejectEventAction(id: string) {
  await requireAdmin();
  await prisma.event.updateMany({
    where: { id },
    data: { isPublished: false, rejectedAt: new Date() },
  });
  revalidateEventPages();
}

export async function toggleEventPublishedAction(id: string) {
  await requireAdmin();
  const current = await prisma.event.findUniqueOrThrow({ where: { id } });
  const event = await prisma.event.update({
    where: { id },
    data: { isPublished: !current.isPublished },
  });
  revalidateEventPages(event.slug);
}

export async function toggleWishlistAction(eventId: string) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id)
    redirect(`/login?callbackUrl=${encodeURIComponent("/wishlist")}`);
  // sem "confere e depois cria": clique duplo não pode gerar favorito repetido
  const where = { userId: session.user.id, eventId };
  const removed = await prisma.wishlist.deleteMany({ where });
  if (removed.count === 0)
    await prisma.wishlist.createMany({ data: [where], skipDuplicates: true });
  revalidatePath("/");
  revalidatePath("/eventos");
  revalidatePath("/explorar");
  revalidatePath("/wishlist");
}

export async function updateProfileAction(formData: FormData) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/perfil/editar");
  const data = z
    .object({
      name: z.string().trim().min(2).max(80),
      avatarUrl: z.union([z.literal(""), z.string().url()]),
    })
    .parse(Object.fromEntries(formData));
  const attachment = formData.get("avatarFile");
  const uploadedAvatar =
    attachment instanceof File && attachment.size > 0
      ? await saveProfileImage(attachment)
      : null;
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      avatarUrl: uploadedAvatar ?? (data.avatarUrl || null),
    },
  });
  revalidatePath("/perfil");
  redirect("/perfil");
}
