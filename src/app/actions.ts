"use server";

import { randomBytes } from "node:crypto";
import { signIn, signOut, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath, updateTag } from "next/cache";
import { CATEGORIES_TAG, EVENTS_TAG } from "@/lib/data";
import {
  accountSecurityLimiter,
  loginLimiter,
  passwordResetEmailLimiter,
  passwordResetIpLimiter,
  profileUpdateLimiter,
  registerEmailLimiter,
  registerIpLimiter,
  resetPasswordLimiter,
  submitEventLimiter,
} from "@/lib/rate-limit";
import { passwordResetEnabled } from "@/lib/env";
import {
  createResetToken,
  parseResetToken,
  sendPasswordResetEmail,
  verifyResetToken,
} from "@/lib/password-reset";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteProfileImage, saveProfileImage } from "@/lib/upload";
import { fromZonedTime } from "date-fns-tz";
import { TIMEZONE } from "@/lib/events";
import { getSession, requireAdminUser } from "@/lib/session";
import {
  httpUrlSchema,
  isSafeLocalPath,
  normalizeEmail,
  safeUrlOrPathSchema,
} from "@/lib/validation";

// só caminhos do próprio site, para não virar redirecionamento aberto
function safeRedirect(value: FormDataEntryValue | string | null) {
  const to = typeof value === "string" ? value : "";
  return isSafeLocalPath(to) ? to : "/";
}

async function clientIpKey() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim() ||
    "unknown";
  return `ip:${ip}`;
}

export async function loginAction(formData: FormData) {
  const to = safeRedirect(formData.get("callbackUrl"));
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  // por e-mail, não por IP: o IP vem de cabeçalho que o visitante consegue
  // forjar, e trocar de IP a cada tentativa furaria o limite
  if (!loginLimiter.hit(email))
    redirect(`/login?erro=tentativas&callbackUrl=${encodeURIComponent(to)}`);
  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: to,
    });
  } catch (error) {
    if (error instanceof AuthError)
      redirect(`/login?erro=credenciais&callbackUrl=${encodeURIComponent(to)}`);
    throw error;
  }
}

export async function googleAction(formData: FormData) {
  await signIn("google", {
    redirectTo: safeRedirect(formData.get("callbackUrl")),
  });
}

export async function registerAction(formData: FormData) {
  const to = safeRedirect(formData.get("callbackUrl"));
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.string().email(),
      password: z.string().min(8).max(128),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      `/cadastro?erro=dados${to !== "/" ? `&callbackUrl=${encodeURIComponent(to)}` : ""}`,
    );

  const email = normalizeEmail(parsed.data.email);
  const ipKey = await clientIpKey();
  if (!registerEmailLimiter.hit(email) || !registerIpLimiter.hit(ipKey))
    redirect(
      `/cadastro?erro=tentativas${to !== "/" ? `&callbackUrl=${encodeURIComponent(to)}` : ""}`,
    );

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing)
    redirect(
      `/cadastro?erro=email${to !== "/" ? `&callbackUrl=${encodeURIComponent(to)}` : ""}`,
    );

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    },
  });
  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: to,
  });
}

export async function requestPasswordResetAction(formData: FormData) {
  if (!passwordResetEnabled) redirect("/esqueci-senha?erro=indisponivel");
  const parsed = z
    .object({ email: z.string().email() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/esqueci-senha?erro=dados");

  const email = normalizeEmail(parsed.data.email);
  const ipKey = await clientIpKey();
  if (
    !passwordResetEmailLimiter.hit(email) ||
    !passwordResetIpLimiter.hit(ipKey)
  ) {
    redirect("/esqueci-senha?erro=tentativas");
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, passwordHash: true },
  });
  if (user) {
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
      .replace(/\/$/, "");
    const token = createResetToken(user.id, user.passwordHash);
    try {
      await sendPasswordResetEmail(
        user.email,
        `${base}/redefinir-senha?token=${encodeURIComponent(token)}`,
      );
    } catch (error) {
      console.error("Erro ao enviar e-mail de redefinição:", error);
      redirect("/esqueci-senha?erro=envio");
    }
  }
  redirect("/esqueci-senha?enviado=1");
}

export async function resetPasswordAction(formData: FormData) {
  const ipKey = await clientIpKey();
  if (!resetPasswordLimiter.hit(ipKey)) redirect("/redefinir-senha?erro=tentativas");

  const parsed = z
    .object({
      token: z.string().min(1),
      password: z.string().min(8).max(128),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const token = String(formData.get("token") ?? "");
    redirect(
      `/redefinir-senha?erro=dados${token ? `&token=${encodeURIComponent(token)}` : ""}`,
    );
  }

  const payload = parseResetToken(parsed.data.token);
  if (!payload) {
    redirect("/redefinir-senha?erro=token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, passwordHash: true },
  });
  if (!user || !verifyResetToken(parsed.data.token, user)) {
    redirect("/redefinir-senha?erro=token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
  });
  redirect("/login?aviso=senha-redefinida");
}

const eventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(20).max(10_000),
  category: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().optional(),
  venueName: z.string().trim().min(2).max(200),
  address: z.string().trim().min(3).max(300),
  externalPurchaseLink: httpUrlSchema,
  socialLink: z.union([z.literal(""), httpUrlSchema]).optional(),
  coverImageUrl: z.union([z.literal(""), safeUrlOrPathSchema]).optional(),
  price: z.string().optional(),
  status: z.enum(["AUTOMATIC", "POSTPONED", "CANCELLED"]),
});

type EventFormError = "dados" | "datas";

// em vez de quebrar a página, devolve o código do erro para a tela mostrar
function parseEventForm(
  formData: FormData,
  forcedStatus?: "AUTOMATIC",
) {
  const raw = Object.fromEntries(formData);
  const parsed = eventSchema.safeParse(
    forcedStatus ? { ...raw, status: forcedStatus } : raw,
  );
  if (!parsed.success) return { error: "dados" as EventFormError };
  const data = parsed.data;
  // datetime-local não tem fuso: interpreta como horário de Belém, não do servidor
  const startAt = fromZonedTime(data.startAt, TIMEZONE);
  const endAt = data.endAt ? fromZonedTime(data.endAt, TIMEZONE) : null;
  const price = data.price ? Number(data.price) : null;
  if (
    Number.isNaN(startAt.getTime()) ||
    (endAt && Number.isNaN(endAt.getTime())) ||
    (price !== null && (!Number.isFinite(price) || price < 0 || price > 100_000))
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
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// "festival-das-aguas-<tempo>-<rand>": único mesmo em criações simultâneas
function makeSlug(title: string) {
  const base = slugify(title) || "evento";
  return `${base}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

export async function createEventAction(formData: FormData) {
  const user = await requireAdminUser();
  const parsed = parseEventForm(formData);
  if ("error" in parsed) redirect(`/admin/eventos/novo?erro=${parsed.error}`);
  const { input, values } = parsed;

  const [city, category] = await Promise.all([
    prisma.city.findUniqueOrThrow({ where: { slug: "belem" } }),
    prisma.category.findUnique({
      where: { id: input.category },
      select: { id: true },
    }),
  ]);
  if (!category) redirect("/admin/eventos/novo?erro=dados");

  const slug = makeSlug(input.title);
  await prisma.event.create({
    data: {
      ...values,
      slug,
      cityId: city.id,
      createdById: user.id,
      categories: { create: { categoryId: category.id } },
    },
  });
  revalidateEventPages(slug);
  redirect("/admin/eventos");
}

export async function updateEventAction(id: string, formData: FormData) {
  await requireAdminUser();
  const parsed = parseEventForm(formData);
  if ("error" in parsed)
    redirect(`/admin/eventos/${id}/editar?erro=${parsed.error}`);
  const { input, values } = parsed;

  const [existing, category] = await Promise.all([
    prisma.event.findUnique({ where: { id }, select: { id: true } }),
    prisma.category.findUnique({
      where: { id: input.category },
      select: { id: true },
    }),
  ]);
  if (!existing) redirect("/admin/eventos");
  if (!category) redirect(`/admin/eventos/${id}/editar?erro=dados`);

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...values,
      reviewedAt: new Date(),
      categories: { deleteMany: {}, create: { categoryId: category.id } },
    },
  });
  revalidateEventPages(event.slug);
  redirect("/admin/eventos");
}

// updateMany: se outro admin já apagou o evento, não quebra a página
export async function approveEventAction(id: string) {
  await requireAdminUser();
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
  await requireAdminUser();
  await prisma.event.updateMany({
    where: { id },
    data: { isPublished: false, rejectedAt: new Date() },
  });
  revalidateEventPages();
  backToList(formData);
}

export async function restoreEventAction(id: string) {
  await requireAdminUser();
  await prisma.event.updateMany({ where: { id }, data: { rejectedAt: null } });
  revalidateEventPages();
}

// vínculos de categoria e favoritos saem em cascata pelo banco
export async function deleteEventAction(id: string, formData: FormData) {
  await requireAdminUser();
  await prisma.event.deleteMany({ where: { id } });
  revalidateEventPages();
  backToList(formData);
}

export async function toggleEventPublishedAction(id: string) {
  await requireAdminUser();
  const current = await prisma.event.findUnique({
    where: { id },
    select: { id: true, isPublished: true },
  });
  if (!current) return;
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
  const session = await getSession();
  if (!session?.user?.id) {
    // o favorito é salvo depois do login pela rota /favoritar/[id]
    const volta = encodeURIComponent(await refererPath());
    const destino = `/favoritar/${encodeURIComponent(eventId)}?volta=${volta}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(destino)}`);
  }
  const where = { userId: session.user.id, eventId };
  const removed = await prisma.wishlist.deleteMany({ where });
  if (removed.count === 0) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, isPublished: true, rejectedAt: null },
      select: { id: true },
    });
    if (event) {
      await prisma.wishlist.createMany({ data: [where], skipDuplicates: true });
    }
  }
  revalidatePath("/");
  revalidatePath("/eventos");
  revalidatePath("/explorar");
  revalidatePath("/wishlist");
}

export async function confirmFavoriteAction(eventId: string, volta: string) {
  const destino = safeRedirect(volta);
  const session = await getSession();
  if (!session?.user?.id) {
    const aqui = `/favoritar/${encodeURIComponent(eventId)}?volta=${encodeURIComponent(destino)}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(aqui)}`);
  }
  const event = await prisma.event.findFirst({
    where: { id: eventId, isPublished: true, rejectedAt: null },
    select: { id: true },
  });
  if (event) {
    await prisma.wishlist.createMany({
      data: [{ userId: session.user.id, eventId: event.id }],
      skipDuplicates: true,
    });
    revalidatePath("/wishlist");
  }
  redirect(destino);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

// envio público: entra na fila de revisão do admin (não publicado)
export async function submitEventAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/divulgar");
  if (!submitEventLimiter.hit(session.user.id))
    redirect("/divulgar?erro=limite");

  const parsed = parseEventForm(formData, "AUTOMATIC");
  if ("error" in parsed) redirect(`/divulgar?erro=${parsed.error}`);
  const { input, values } = parsed;

  const [city, category] = await Promise.all([
    prisma.city.findUniqueOrThrow({ where: { slug: "belem" } }),
    prisma.category.findUnique({
      where: { id: input.category },
      select: { id: true },
    }),
  ]);
  if (!category) redirect("/divulgar?erro=dados");

  const slug = makeSlug(input.title);
  await prisma.event.create({
    data: {
      title: values.title,
      description: values.description,
      startAt: values.startAt,
      endAt: values.endAt,
      venueName: values.venueName,
      address: values.address,
      externalPurchaseLink: values.externalPurchaseLink,
      socialLink: values.socialLink,
      coverImageUrl: values.coverImageUrl,
      price: values.price,
      source: "organizador",
      isPublished: false,
      isFeatured: false,
      slug,
      cityId: city.id,
      createdById: session.user.id,
      categories: { create: { categoryId: category.id } },
    },
  });
  revalidateEventPages();
  redirect("/divulgar?enviado=1");
}

export async function updateProfileAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/perfil/editar");
  if (!profileUpdateLimiter.hit(session.user.id))
    redirect("/perfil/editar?erro=limite");

  const removeAvatar = formData.get("removeAvatar") === "1";
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      avatarUrl: z.union([z.literal(""), safeUrlOrPathSchema]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/perfil/editar?erro=dados");

  const data = parsed.data;
  const attachment = formData.get("avatarFile");
  let uploadedAvatar: string | null = null;
  if (!removeAvatar && attachment instanceof File && attachment.size > 0) {
    try {
      uploadedAvatar = await saveProfileImage(attachment);
    } catch {
      redirect("/perfil/editar?erro=imagem");
    }
  }

  const nextAvatarUrl = removeAvatar
    ? null
    : (uploadedAvatar ?? (data.avatarUrl || null));
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      avatarUrl: nextAvatarUrl,
    },
  });

  if (current?.avatarUrl && current.avatarUrl !== nextAvatarUrl) {
    await deleteProfileImage(current.avatarUrl);
  }

  await unstable_update({ user: { name: data.name, image: nextAvatarUrl } });
  revalidatePath("/", "layout");
  revalidatePath("/perfil");
  redirect(removeAvatar ? "/perfil/editar?aviso=foto-removida" : "/perfil");
}

export async function changeEmailAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/perfil/editar");
  if (!accountSecurityLimiter.hit(`email:${session.user.id}`))
    redirect("/perfil/editar?erro=limite");

  const parsed = z
    .object({
      email: z.string().email(),
      currentPassword: z.string().min(1),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/perfil/editar?erro=email-dados");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) redirect("/login");
  if (
    !user.passwordHash ||
    !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))
  ) {
    redirect("/perfil/editar?erro=senha-atual");
  }

  const nextEmail = normalizeEmail(parsed.data.email);
  if (nextEmail === normalizeEmail(user.email)) {
    redirect("/perfil/editar?aviso=email");
  }

  const existing = await prisma.user.findFirst({
    where: {
      email: { equals: nextEmail, mode: "insensitive" },
      id: { not: user.id },
    },
    select: { id: true },
  });
  if (existing) redirect("/perfil/editar?erro=email-em-uso");

  await prisma.user.update({
    where: { id: user.id },
    data: { email: nextEmail },
  });
  await unstable_update({ user: { email: nextEmail } });
  revalidatePath("/", "layout");
  revalidatePath("/perfil");
  redirect("/perfil/editar?aviso=email");
}

export async function changePasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/perfil/editar");
  if (!accountSecurityLimiter.hit(`pw:${session.user.id}`))
    redirect("/perfil/editar?erro=limite");

  const parsed = z
    .object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8).max(128),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/perfil/editar?erro=senha-nova");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) redirect("/login");

  if (user.passwordHash) {
    const ok =
      Boolean(parsed.data.currentPassword) &&
      (await bcrypt.compare(parsed.data.currentPassword!, user.passwordHash));
    if (!ok) redirect("/perfil/editar?erro=senha-atual");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });
  redirect("/perfil/editar?aviso=senha");
}

async function deleteUserSafely(
  userId: string,
  avatarUrl: string | null,
  preferredAdminId?: string,
) {
  const deleted = await prisma.$transaction(async (tx) => {
    // remove envios/rascunhos não publicados do usuário; publicados ficam sob um admin
    await tx.event.deleteMany({
      where: { createdById: userId, isPublished: false },
    });
    const remainingPublished = await tx.event.count({
      where: { createdById: userId },
    });
    if (remainingPublished > 0) {
      const fallbackId =
        preferredAdminId && preferredAdminId !== userId
          ? preferredAdminId
          : (
              await tx.user.findFirst({
                where: { role: "ADMIN", id: { not: userId } },
                select: { id: true },
              })
            )?.id;
      if (!fallbackId) return false;
      await tx.event.updateMany({
        where: { createdById: userId },
        data: { createdById: fallbackId },
      });
    }
    await tx.user.delete({ where: { id: userId } });
    return true;
  });

  if (!deleted) return false;
  await deleteProfileImage(avatarUrl);
  revalidateEventPages();
  return true;
}

export async function deleteAccountAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/perfil/editar");
  if (!accountSecurityLimiter.hit(`del:${session.user.id}`))
    redirect("/perfil/editar?erro=limite");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, passwordHash: true, avatarUrl: true },
  });
  if (!user) redirect("/");

  if (user.passwordHash) {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    if (
      !currentPassword ||
      !(await bcrypt.compare(currentPassword, user.passwordHash))
    ) {
      redirect("/perfil/editar?erro=senha-atual");
    }
  } else {
    const confirmText = String(formData.get("confirmText") ?? "").trim();
    if (confirmText !== "EXCLUIR") {
      redirect("/perfil/editar?erro=confirmacao");
    }
  }

  if (user.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) redirect("/perfil/editar?erro=ultimo-admin");
  }

  if (!(await deleteUserSafely(user.id, user.avatarUrl))) {
    redirect("/perfil/editar?erro=excluir");
  }

  await signOut({ redirectTo: "/" });
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
  await requireAdminUser();
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
  await requireAdminUser();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/categorias?erro=dados");
  await prisma.category.updateMany({ where: { id }, data: parsed.data });
  revalidateCategoryPages();
  redirect("/admin/categorias");
}

// os vínculos com eventos saem em cascata; os eventos ficam sem categoria
export async function deleteCategoryAction(id: string) {
  await requireAdminUser();
  await prisma.category.deleteMany({ where: { id } });
  revalidateCategoryPages();
  redirect("/admin/categorias");
}

export async function updateUserRoleAction(id: string, formData: FormData) {
  const admin = await requireAdminUser();
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

export async function adminDeleteUserAction(id: string) {
  const admin = await requireAdminUser();
  if (id === admin.id) redirect("/admin/usuarios?erro=excluir-proprio");

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, avatarUrl: true },
  });
  if (!target) {
    revalidatePath("/admin/usuarios");
    return;
  }
  if (target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) redirect("/admin/usuarios?erro=ultimo-admin");
  }

  if (!(await deleteUserSafely(target.id, target.avatarUrl, admin.id))) {
    redirect("/admin/usuarios?erro=excluir");
  }
  revalidatePath("/admin/usuarios");
}
