import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { categories, demoEvents } from "./catalog";
import { eventDateRange, startOfTodayInBelem } from "./events";

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

const EVENTS_PAGE_SIZE = 24;

export type EventsQuery = {
  search?: string;
  category?: string;
  price?: string;
  date?: string;
  featured?: boolean;
};

// filtros compartilhados por listagem e contagem
function eventsWhere(query: EventsQuery): Prisma.EventWhereInput {
  const range = eventDateRange(query.date);
  return {
    isPublished: true,
    city: { slug: "belem" },
    // só eventos que ainda não acabaram, senão os antigos ocupam as vagas
    AND: [
      {
        OR: [
          { endAt: { gte: new Date() } },
          { endAt: null, startAt: { gte: startOfTodayInBelem() } },
        ],
      },
      // acontece no intervalo: começa antes do fim e termina depois do início
      ...(range
        ? [
            {
              startAt: { lt: range.to },
              OR: [
                { endAt: { gte: range.from } },
                { endAt: null, startAt: { gte: range.from } },
              ],
            },
          ]
        : []),
    ],
    ...(query.featured ? { isFeatured: true } : {}),
    ...(query.search
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
    ...(query.category
      ? { categories: { some: { category: { slug: query.category } } } }
      : {}),
    ...(query.price === "gratuito"
      ? { price: null }
      : query.price === "pago"
        ? { price: { not: null } }
        : {}),
  };
}

const queryEvents = unstable_cache(
  async (
    search?: string,
    category?: string,
    price?: string,
    date?: string,
    featured?: boolean,
    sort?: string,
    page?: number,
  ) => {
    const rows = await prisma.event.findMany({
      where: eventsWhere({ search, category, price, date, featured }),
      include: eventInclude,
      // preço: gratuitos (null) primeiro, depois do mais barato ao mais caro
      orderBy:
        sort === "preco"
          ? [{ price: { sort: "asc", nulls: "first" } }, { startAt: "asc" }]
          : { startAt: "asc" },
      take: EVENTS_PAGE_SIZE * (page ?? 1),
    });
    return rows.map(toEvent);
  },
  ["events-list"],
  { tags: [EVENTS_TAG], revalidate: 300 },
);

const queryEventsCount = unstable_cache(
  (
    search?: string,
    category?: string,
    price?: string,
    date?: string,
    featured?: boolean,
  ) =>
    prisma.event.count({
      where: eventsWhere({ search, category, price, date, featured }),
    }),
  ["events-count"],
  { tags: [EVENTS_TAG], revalidate: 300 },
);

// no modo demo, só busca, categoria e preço valem; data e ordem são ignoradas
function demoMatches(query?: EventsQuery) {
  return demoEvents.filter(
    (e) =>
      (!query?.search ||
        `${e.title} ${e.venueName} ${e.category.name}`
          .toLowerCase()
          .includes(query.search.toLowerCase())) &&
      (!query?.category || e.category.slug === query.category) &&
      (!query?.price ||
        (query.price === "gratuito" ? e.price == null : e.price != null)) &&
      (!query?.featured || e.isFeatured),
  );
}

export async function getEvents(
  query?: EventsQuery & { sort?: "data" | "preco"; page?: number },
) {
  try {
    const rows = await queryEvents(
      query?.search,
      query?.category,
      query?.price,
      query?.date,
      query?.featured,
      query?.sort,
      query?.page,
    );
    return rows.map(reviveDates);
  } catch (error) {
    // em produção, banco fora do ar mostra a página de erro, não eventos falsos
    if (process.env.NODE_ENV === "production") throw error;
    return demoMatches(query);
  }
}

export async function countEvents(query?: EventsQuery) {
  try {
    return await queryEventsCount(
      query?.search,
      query?.category,
      query?.price,
      query?.date,
      query?.featured,
    );
  } catch (error) {
    // em produção, banco fora do ar mostra a página de erro, não eventos falsos
    if (process.env.NODE_ENV === "production") throw error;
    return demoMatches(query).length;
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
  } catch (error) {
    // em produção, banco fora do ar mostra a página de erro, não eventos falsos
    if (process.env.NODE_ENV === "production") throw error;
    const demo = demoEvents.find((e) => e.slug === slug);
    return demo ? { ...demo, endAt: null } : null;
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
  } catch (error) {
    // em produção, banco fora do ar mostra a página de erro, não eventos falsos
    if (process.env.NODE_ENV === "production") throw error;
    return categories.map(([name, slug, icon], i) => ({
      id: String(i),
      name,
      slug,
      icon,
      createdAt: new Date(),
    }));
  }
}
