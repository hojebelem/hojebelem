import { prisma } from "./prisma";
import { categories, demoEvents } from "./catalog";
import { startOfTodayInBelem } from "./events";

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

export async function getEvents(query?: {
  search?: string;
  category?: string;
  price?: string;
}) {
  try {
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
export async function getEvent(slug: string) {
  try {
    const row = await prisma.event.findFirst({
      where: { slug, isPublished: true, city: { slug: "belem" } },
      include: eventInclude,
    });
    return row ? toEvent(row) : null;
  } catch {
    return demoEvents.find((e) => e.slug === slug) ?? null;
  }
}
export async function getCategories() {
  try {
    const rows = await prisma.category.findMany({ orderBy: { name: "asc" } });
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
