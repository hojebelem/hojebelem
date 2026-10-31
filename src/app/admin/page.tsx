import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CircleX,
  ClipboardCheck,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEventDate, startOfTodayInBelem } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const [published, upcoming, pending, cancelled, recent] = await Promise.all([
    prisma.event.count({ where: { isPublished: true, rejectedAt: null } }),
    prisma.event.count({
      where: {
        isPublished: true,
        OR: [
          { endAt: { gte: new Date() } },
          { endAt: null, startAt: { gte: startOfTodayInBelem() } },
        ],
      },
    }),
    prisma.event.count({
      where: { source: { not: "manual" }, reviewedAt: null, rejectedAt: null },
    }),
    prisma.event.count({
      where: { statusOverride: "CANCELLED", rejectedAt: null },
    }),
    prisma.event.findMany({
      where: { rejectedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);
  const stats = [
    { Icon: CalendarCheck, label: "Publicados", value: published },
    { Icon: CalendarClock, label: "Próximos", value: upcoming },
    { Icon: ClipboardCheck, label: "Pendentes de revisão", value: pending },
    { Icon: CircleX, label: "Cancelados", value: cancelled },
  ];
  return (
    <div className="admin-page shell page-space">
      <div className="admin-heading">
        <div>
          <p>PAINEL ADMINISTRATIVO</p>
          <h1>Visão geral</h1>
          <span>Gerencie o que acontece em Belém.</span>
        </div>
        <Link className="gradient-button" href="/admin/eventos/novo">
          <Plus /> Novo evento
        </Link>
      </div>
      <div className="stats-grid">
        {stats.map(({ Icon, label, value }) => (
          <div key={label}>
            <Icon />
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      {pending > 0 && (
        <p className="admin-notice">
          {pending} {pending === 1 ? "evento aguarda" : "eventos aguardam"}{" "}
          revisão. <Link href="/admin/eventos">Revisar agora →</Link>
        </p>
      )}
      <section className="admin-list">
        <div>
          <h2>Atualizados recentemente</h2>
          <Link href="/admin/eventos">Ver todos</Link>
        </div>
        {recent.map((event) => (
          <article key={event.id}>
            <span>{formatEventDate(event.startAt).toUpperCase()}</span>
            <div>
              <b>{event.title}</b>
              <small>
                {event.venueName} • {event.isPublished ? "Publicado" : "Rascunho"}
              </small>
            </div>
            <Link href={`/admin/eventos/${event.id}/editar`}>Editar</Link>
          </article>
        ))}
        {recent.length === 0 && <p>Nenhum evento cadastrado ainda.</p>}
      </section>
    </div>
  );
}
