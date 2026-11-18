import { EventSection } from "@/components/section";
import { eventCardSelect, toEvent } from "@/lib/data";
import { startOfTodayInBelem } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Heart } from "lucide-react";
import { redirect } from "next/navigation";

export default async function Wishlist() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/wishlist");

  const saved = await prisma.wishlist.findMany({
    where: {
      userId: session.user.id,
      event: { isPublished: true, rejectedAt: null },
    },
    select: {
      event: { select: eventCardSelect },
    },
    orderBy: { createdAt: "desc" },
  });
  const events = saved.map(({ event }) => toEvent(event));
  const categoryIds = [
    ...new Set(
      saved.flatMap(({ event }) =>
        event.categories.map(({ categoryId }) => categoryId),
      ),
    ),
  ];
  const recommendationsRaw = await prisma.event.findMany({
    where: {
      isPublished: true,
      rejectedAt: null,
      city: { slug: "belem" },
      // só eventos que ainda não acabaram
      OR: [
        { endAt: { gte: new Date() } },
        { endAt: null, startAt: { gte: startOfTodayInBelem() } },
      ],
      id: { notIn: events.map((event) => event.id) },
      ...(categoryIds.length
        ? { categories: { some: { categoryId: { in: categoryIds } } } }
        : {}),
    },
    select: eventCardSelect,
    orderBy: { startAt: "asc" },
    take: 4,
  });
  const recommendations = recommendationsRaw.map(toEvent);
  return (
    <div className="shell page-space">
      <div className="page-intro">
        <p>GUARDADOS PARA DEPOIS</p>
        <h1>Seus favoritos</h1>
        <span>Todos os eventos que você quer viver em Belém.</span>
      </div>
      {events.length ? (
        <EventSection title="Eventos salvos" events={events} />
      ) : (
        <div className="empty-state">
          <Heart />
          <b>Sua wishlist está vazia</b>
          <p>Toque no coração de um evento para guardá-lo aqui.</p>
        </div>
      )}
      <EventSection
        eyebrow="COM BASE NOS SEUS FAVORITOS"
        title="Você também pode gostar"
        events={recommendations}
      />
    </div>
  );
}
