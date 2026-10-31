import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { categories, demoEvents } from "./catalog";
import { startOfTodayInBelem } from "./events";

// Eventos e categorias ficam em cache por alguns minutos; as ações do admin
// limpam a tag na hora (updateTag). O coletor grava direto no banco, então os
// eventos dele aparecem em até 5 minutos.
export const EVENTS_TAG = "events";
export const CATEGORIES_TAG = "categories";

// o cache guarda JSON: datas voltam como texto e precisam virar Date de novo
function reviveDates<
  T extends {
    startAt: Date;
    endAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    reviewedAt: Date | null;
    rejectedAt: Date | null;
  },
>(e: T): T {
  const date = (d: Date | null) => (d == null ? null : new Date(d));
  return {
    ...e,
    startAt: new Date(e.startAt),
    endAt: date(e.endAt),
    createdAt: new Date(e.createdAt),
    updatedAt: new Date(e.updatedAt),
    reviewedAt: date(e.reviewedAt),
    rejectedAt: date(e.rejectedAt),
  };
}

const eventInclude = { categories: { include: { category: true } } } as const;

function toEvent<
  T extends {
    price: { toString(): string } | null;
    categories: { category: { name: string; slug: string; icon: string } }[];
  },
>(e: T) {
  return {
    ...e,
    price: e.price ? Number(e.price) : null,
    category: e.categories[0]?.category ?? {
      name: "Evento",
      slug: "eventos",
      icon: "✦",
    },
  };
}

const queryEvents = unstable_cache(
  async (search?: string, category?: string, price?: string) => {
    const query = { search, category, price };
    const rows = await prisma.event.findMany({
      where: {
        isPublished: true,
        city: { slug: "belem" },
        // só eventos que ainda não acabaram, senão os antigos ocupam as 24 vagas
        AND: [
          {
            OR: [
              { endAt: { gte: new Date() } },
              { endAt: null, startAt: { gte: startOfTodayInBelem() } },
            ],
          },
        ],
        ...(query?.search
          ? {
              OR: [
                { title: { contains: query.search, mode: "insensitive" } },
                { venueName: { contains: query.search, mode: "insensitive" } },
                {
                  createdBy: {
                    name: { contains: query.search, mode: "insensitive" },
                  },
                },
                {
                  categories: {
                    some: {
                      category: {
                        name: { contains: query.search, mode: "insensitive" },
                      },
                    },
                  },
                },
              ],
            }
          : {}),
        ...(query?.category
          ? { categories: { some: { category: { slug: query.category } } } }
          : {}),
        ...(query?.price === "gratuito"
          ? { price: null }
          : query?.price === "pago"
            ? { price: { not: null } }
            : {}),
      },
      include: eventInclude,
      orderBy: { startAt: "asc" },
      take: 24,
    });
    return rows.map(toEvent);
  },
  ["events-list"],
  { tags: [EVENTS_TAG], revalidate: 300 },
);

export async function getEvents(query?: {
  search?: string;
  category?: string;
  price?: string;
}) {
  try {
    const rows = await queryEvents(query?.search, query?.category, query?.price);
    return rows.map(reviveDates);
  } catch {
    return demoEvents.filter(
      (e) =>
        (!query?.search ||
          `${e.title} ${e.venueName} ${e.category.name}`
            .toLowerCase()
            .includes(query.search.toLowerCase())) &&
        (!query?.category || e.category.slug === query.category) &&
        (!query?.price ||
          (query.price === "gratuito" ? e.price == null : e.price != null)),
    );
  }
}
const queryEvent = unstable_cache(
  async (slug: string) => {
    const row = await prisma.event.findFirst({
      where: { slug, isPublished: true, city: { slug: "belem" } },
      include: eventInclude,
    });
    return row ? toEvent(row) : null;
  },
  ["event-detail"],
  { tags: [EVENTS_TAG], revalidate: 300 },
);

// cache() do React: página e metadados pedem o mesmo evento, uma consulta só
export const getEvent = cache(async (slug: string) => {
  try {
    const row = await queryEvent(slug);
    return row ? reviveDates(row) : null;
  } catch {
    return demoEvents.find((e) => e.slug === slug) ?? null;
  }
});

const queryCategories = unstable_cache(
  () => prisma.category.findMany({ orderBy: { name: "asc" } }),
  ["categories"],
  { tags: [CATEGORIES_TAG], revalidate: 600 },
);

export async function getCategories() {
  try {
    const rows = await queryCategories();
    return rows.length
      ? rows
      : categories.map(([name, slug, icon], i) => ({
          id: String(i),
          name,
          slug,
          icon,
          createdAt: new Date(),
        }));
  } catch {
    return categories.map(([name, slug, icon], i) => ({
      id: String(i),
      name,
      slug,
      icon,
      createdAt: new Date(),
    }));
  }
}
