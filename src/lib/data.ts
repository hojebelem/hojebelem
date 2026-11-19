import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { categories, demoEvents } from "./catalog";
import {
  eventDateRange,
  neighborhoodMatchTerms,
  startOfTodayInBelem,
} from "./events";

// Eventos e categorias ficam em cache por alguns minutos; as ações do admin
// limpam a tag na hora (updateTag). O coletor grava direto no banco, então os
// eventos dele aparecem em até 5 minutos.
export const EVENTS_TAG = "events";
export const CATEGORIES_TAG = "categories";

export const EVENTS_PAGE_SIZE = 24;
const MAX_SEARCH_LENGTH = 100;

type EventDateFields = {
  startAt: Date;
  endAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  reviewedAt?: Date | null;
  rejectedAt?: Date | null;
};

// o cache guarda JSON: datas voltam como texto e precisam virar Date de novo
function reviveDates<T extends EventDateFields>(e: T): T {
  const date = (d: Date | null | undefined) => (d == null ? null : new Date(d));
  return {
    ...e,
    startAt: new Date(e.startAt),
    endAt: date(e.endAt),
    ...(e.createdAt !== undefined ? { createdAt: new Date(e.createdAt) } : {}),
    ...(e.updatedAt !== undefined ? { updatedAt: new Date(e.updatedAt) } : {}),
    ...(e.reviewedAt !== undefined
      ? { reviewedAt: date(e.reviewedAt) }
      : {}),
    ...(e.rejectedAt !== undefined
      ? { rejectedAt: date(e.rejectedAt) }
      : {}),
  };
}

const eventInclude = { categories: { include: { category: true } } } as const;

export const eventCardSelect = {
  id: true,
  slug: true,
  title: true,
  coverImageUrl: true,
  startAt: true,
  endAt: true,
  venueName: true,
  latitude: true,
  longitude: true,
  price: true,
  statusOverride: true,
  isFeatured: true,
  categories: { include: { category: true } },
} satisfies Prisma.EventSelect;

export function toEvent<
  T extends {
    price: { toString(): string } | null;
    latitude?: { toString(): string } | number | null;
    longitude?: { toString(): string } | number | null;
    categories: { category: { name: string; slug: string; icon: string } }[];
  },
>(e: T) {
  return {
    ...e,
    price: e.price != null ? Number(e.price) : null,
    latitude: e.latitude != null ? Number(e.latitude) : null,
    longitude: e.longitude != null ? Number(e.longitude) : null,
    category: e.categories[0]?.category ?? {
      name: "Evento",
      slug: "eventos",
      icon: "✦",
    },
  };
}

export type EventsQuery = {
  search?: string;
  category?: string;
  price?: string;
  date?: string;
  neighborhood?: string;
  featured?: boolean;
};

// filtros compartilhados por listagem e contagem
function eventsWhere(query: EventsQuery): Prisma.EventWhereInput {
  const range = eventDateRange(query.date);
  const neighborhoodTerms = neighborhoodMatchTerms(query.neighborhood);
  const search = query.search?.trim().slice(0, MAX_SEARCH_LENGTH);
  return {
    isPublished: true,
    rejectedAt: null,
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
      ...(neighborhoodTerms
        ? [
            {
              OR: neighborhoodTerms.map((term) => ({
                address: { contains: term, mode: "insensitive" as const },
              })),
            },
          ]
        : []),
    ],
    ...(query.featured ? { isFeatured: true } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { venueName: { contains: search, mode: "insensitive" } },
            {
              createdBy: {
                name: { contains: search, mode: "insensitive" },
              },
            },
            {
              categories: {
                some: {
                  category: {
                    name: { contains: search, mode: "insensitive" },
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

async function fetchEventsFromDb(
  query: EventsQuery,
  sort: string | undefined,
  take: number,
) {
  const rows = await prisma.event.findMany({
    where: eventsWhere(query),
    select: eventCardSelect,
    // preço: gratuitos (null) primeiro, depois do mais barato ao mais caro
    orderBy:
      sort === "preco"
        ? [{ price: { sort: "asc", nulls: "first" } }, { startAt: "asc" }]
        : { startAt: "asc" },
    take,
  });
  return rows.map(toEvent);
}

const queryCachedEvents = unstable_cache(
  async (
    category?: string,
    price?: string,
    date?: string,
    neighborhood?: string,
    featured?: boolean,
    sort?: string,
    take = EVENTS_PAGE_SIZE,
  ) =>
    fetchEventsFromDb(
      { category, price, date, neighborhood, featured },
      sort,
      take,
    ),
  ["events-list"],
  { tags: [EVENTS_TAG], revalidate: 300 },
);

const queryCachedEventsCount = unstable_cache(
  (
    category?: string,
    price?: string,
    date?: string,
    neighborhood?: string,
    featured?: boolean,
  ) =>
    prisma.event.count({
      where: eventsWhere({ category, price, date, neighborhood, featured }),
    }),
  ["events-count"],
  { tags: [EVENTS_TAG], revalidate: 300 },
);

// no modo demo, só busca, categoria, bairro e preço valem; data e ordem são ignoradas
function demoMatches(query?: EventsQuery) {
  const neighborhoodTerms = neighborhoodMatchTerms(query?.neighborhood);
  return demoEvents.filter(
    (e) =>
      (!query?.search ||
        `${e.title} ${e.venueName} ${e.category.name}`
          .toLowerCase()
          .includes(query.search.toLowerCase())) &&
      (!query?.category || e.category.slug === query.category) &&
      (!neighborhoodTerms ||
        neighborhoodTerms.some((term) =>
          e.address.toLowerCase().includes(term),
        )) &&
      (!query?.price ||
        (query.price === "gratuito" ? e.price == null : e.price != null)) &&
      (!query?.featured || e.isFeatured),
  );
}

export async function getEvents(
  query?: EventsQuery & { sort?: "data" | "preco"; page?: number; limit?: number },
) {
  const take = query?.limit ?? EVENTS_PAGE_SIZE * (query?.page ?? 1);
  const search = query?.search?.trim().slice(0, MAX_SEARCH_LENGTH);
  try {
    // buscas livres não vão para unstable_cache para evitar explosão de chaves
    const rows = search
      ? await fetchEventsFromDb({ ...query, search }, query?.sort, take)
      : await queryCachedEvents(
          query?.category,
          query?.price,
          query?.date,
          query?.neighborhood,
          query?.featured,
          query?.sort,
          take,
        );
    return rows.map(reviveDates);
  } catch (error) {
    // em produção, banco fora do ar mostra a página de erro, não eventos falsos
    if (process.env.NODE_ENV === "production") throw error;
    return demoMatches(query).slice(0, take);
  }
}

export async function countEvents(query?: EventsQuery) {
  const search = query?.search?.trim().slice(0, MAX_SEARCH_LENGTH);
  try {
    return search
      ? await prisma.event.count({ where: eventsWhere({ ...query, search }) })
      : await queryCachedEventsCount(
          query?.category,
          query?.price,
          query?.date,
          query?.neighborhood,
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
      where: {
        slug,
        isPublished: true,
        rejectedAt: null,
        city: { slug: "belem" },
      },
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
