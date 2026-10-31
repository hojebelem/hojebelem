"use server";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath, updateTag } from "next/cache";
import { CATEGORIES_TAG, EVENTS_TAG } from "@/lib/data";
import { loginLimiter } from "@/lib/rate-limit";
import { headers } from "next/headers";
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
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  // por e-mail, não por IP: o IP vem de cabeçalho que o visitante consegue
  // forjar, e trocar de IP a cada tentativa furaria o limite
  if (!loginLimiter.hit(email))
    redirect(`/login?erro=tentativas&callbackUrl=${encodeURIComponent(to)}`);
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: to,
    });
  } catch (error) {
    if (error instanceof AuthError)
      redirect(`/login?erro=credenciais&callbackUrl=${encodeURIComponent(to)}`);
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

type EventFormError = "dados" | "datas";

// em vez de quebrar a página, devolve o código do erro para a tela mostrar
function parseEventForm(formData: FormData) {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "dados" as EventFormError };
  const data = parsed.data;
  // datetime-local não tem fuso: interpreta como horário de Belém, não do servidor
  const startAt = fromZonedTime(data.startAt, TIMEZONE);
  const endAt = data.endAt ? fromZonedTime(data.endAt, TIMEZONE) : null;
  const price = data.price ? Number(data.price) : null;
  if (
    Number.isNaN(startAt.getTime()) ||
    (endAt && Number.isNaN(endAt.getTime())) ||
    (price !== null && !(price >= 0))
  )
    return { error: "dados" as EventFormError };
  if (endAt && endAt <= startAt) return { error: "datas" as EventFormError };
  return {
    input: data,
    values: {
      title: data.title,
      description: data.description,
      startAt,
      endAt,
      venueName: data.venueName,
      address: data.address,
      externalPurchaseLink: data.externalPurchaseLink,
      socialLink: data.socialLink || null,
      coverImageUrl: data.coverImageUrl || "/images/hero-belem.webp",
      price,
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

// "Festival das Águas" -> "festival-das-aguas": minúsculo e sem acentos
function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// "festival-das-aguas-<tempo>": único
function makeSlug(title: string) {
  return `${slugify(title)}-${Date.now().toString(36)}`;
}

export async function createEventAction(formData: FormData) {
  const user = await requireAdmin();
  const parsed = parseEventForm(formData);
  if ("error" in parsed) redirect(`/admin/eventos/novo?erro=${parsed.error}`);
  const { input, values } = parsed;
  const city = await prisma.city.findUniqueOrThrow({
    where: { slug: "belem" },
  });
  const slug = makeSlug(input.title);
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
  const parsed = parseEventForm(formData);
  if ("error" in parsed)
    redirect(`/admin/eventos/${id}/editar?erro=${parsed.error}`);
  const { input, values } = parsed;
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

// o formulário da tela de edição manda voltar=lista; na lista não precisa sair da página
function backToList(formData: FormData) {
  if (formData.get("voltar") === "lista") redirect("/admin/eventos");
}

export async function rejectEventAction(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.event.updateMany({
    where: { id },
    data: { isPublished: false, rejectedAt: new Date() },
  });
  revalidateEventPages();
  backToList(formData);
}

export async function restoreEventAction(id: string) {
  await requireAdmin();
  await prisma.event.updateMany({ where: { id }, data: { rejectedAt: null } });
  revalidateEventPages();
}

// vínculos de categoria e favoritos saem em cascata pelo banco
export async function deleteEventAction(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.event.deleteMany({ where: { id } });
  revalidateEventPages();
  backToList(formData);
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

// caminho + query da página de onde o clique veio (só mesma origem)
async function refererPath() {
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer");
  const host = requestHeaders.get("host");
  if (!referer || !host) return "/";
  try {
    const url = new URL(referer);
    return url.host === host ? `${url.pathname}${url.search}` : "/";
  } catch {
    return "/";
  }
}

export async function toggleWishlistAction(eventId: string) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) {
    // o favorito é salvo depois do login pela rota /favoritar/[id]
    const volta = encodeURIComponent(await refererPath());
    const destino = `/favoritar/${eventId}?volta=${volta}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(destino)}`);
  }
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

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

// envio público: entra na fila de revisão do admin (não publicado)
export async function submitEventAction(formData: FormData) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/divulgar");
  const parsed = eventSchema.safeParse({
    ...Object.fromEntries(formData),
    status: "AUTOMATIC",
  });
  if (!parsed.success) redirect("/divulgar?erro=dados");
  const data = parsed.data;
  const price = data.price ? Number(data.price) : null;
  const startAt = fromZonedTime(data.startAt, TIMEZONE);
  const endAt = data.endAt ? fromZonedTime(data.endAt, TIMEZONE) : null;
  if (
    Number.isNaN(startAt.getTime()) ||
    (endAt && Number.isNaN(endAt.getTime())) ||
    (price !== null && !(price >= 0))
  )
    redirect("/divulgar?erro=dados");
  const city = await prisma.city.findUniqueOrThrow({
    where: { slug: "belem" },
  });
  const slug = makeSlug(data.title);
  await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      startAt,
      endAt,
      venueName: data.venueName,
      address: data.address,
      externalPurchaseLink: data.externalPurchaseLink,
      socialLink: data.socialLink || null,
      coverImageUrl: data.coverImageUrl || "/images/hero-belem.webp",
      price,
      source: "organizador",
      isPublished: false,
      isFeatured: false,
      slug,
      cityId: city.id,
      createdById: session.user.id,
      categories: { create: { categoryId: data.category } },
    },
  });
  revalidateEventPages();
  redirect("/divulgar?enviado=1");
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

const categorySchema = z.object({
  name: z.string().trim().min(2).max(40),
  icon: z.string().trim().min(1).max(8),
});

function revalidateCategoryPages() {
  updateTag(CATEGORIES_TAG);
  updateTag(EVENTS_TAG);
  revalidatePath("/admin/categorias");
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/categorias?erro=dados");
  const slug = slugify(parsed.data.name);
  if (!slug) redirect("/admin/categorias?erro=dados");
  if (await prisma.category.findUnique({ where: { slug } }))
    redirect("/admin/categorias?erro=existe");
  await prisma.category.create({ data: { ...parsed.data, slug } });
  revalidateCategoryPages();
  redirect("/admin/categorias");
}

// o slug não muda: os links ?categoria= continuam valendo
export async function updateCategoryAction(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/categorias?erro=dados");
  await prisma.category.updateMany({ where: { id }, data: parsed.data });
  revalidateCategoryPages();
  redirect("/admin/categorias");
}

// os vínculos com eventos saem em cascata; os eventos ficam sem categoria
export async function deleteCategoryAction(id: string) {
  await requireAdmin();
  await prisma.category.deleteMany({ where: { id } });
  revalidateCategoryPages();
  redirect("/admin/categorias");
}

export async function updateUserRoleAction(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({ role: z.enum(["USER", "ORGANIZER", "ADMIN"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/usuarios?erro=dados");
  const { role } = parsed.data;
  if (id === admin.id && role !== "ADMIN")
    redirect("/admin/usuarios?erro=proprio");
  if (role !== "ADMIN") {
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) redirect("/admin/usuarios?erro=ultimo-admin");
    }
  }
  await prisma.user.updateMany({ where: { id }, data: { role } });
  revalidatePath("/admin/usuarios");
}
