import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// refeito a cada hora; no build (sem banco) sai só com as páginas fixas
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    "",
    "/eventos",
    "/explorar",
    "/divulgar",
    "/perguntas-frequentes",
    "/sobre",
    "/contato",
    "/termos",
    "/privacidade",
  ].map((path) => ({ url: `${base}${path}` }));
  try {
    const events = await prisma.event.findMany({
      where: { isPublished: true, rejectedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { startAt: "desc" },
      take: 5000,
    });
    return pages.concat(
      events.map((e) => ({
        url: `${base}/eventos/${e.slug}`,
        lastModified: e.updatedAt,
      })),
    );
  } catch {
    return pages;
  }
}
