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
import { requireAdminPage } from "@/lib/session";

export const dynamic = "force-dynamic";

const pendingWhere = {
  source: { not: "manual" },
  reviewedAt: null,
  rejectedAt: null,
};

const collectorWhere = {
  source: { notIn: ["manual", "organizador"] },
};

const collectionFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Belem",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// "31/10, 14:20" -> "31/10 às 14:20"
function formatCollection(date: Date) {
  return collectionFormat.format(date).replace(",", " às");
}

const RUN_STATUS: Record<string, string> = {
  OK: "Concluída",
  ABORTED: "Abortada (>30% inválidos)",
  ERROR: "Falhou",
};

export default async function Admin() {
  await requireAdminPage("/admin");
  const [
    published,
    upcoming,
    pending,
    cancelled,
    recent,
    lastCollection,
    lastRunRecord,
    symplaPending,
  ] = await Promise.all([
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
    prisma.event.count({ where: pendingWhere }),
    prisma.event.count({
      where: { statusOverride: "CANCELLED", rejectedAt: null },
    }),
    prisma.event.findMany({
      where: { rejectedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.event.aggregate({
      where: collectorWhere,
      _max: { updatedAt: true },
    }),
    prisma.collectorRun
      .findFirst({ orderBy: { startedAt: "desc" } })
      .catch(() => null),
    prisma.event.count({ where: { ...pendingWhere, ...collectorWhere } }),
  ]);
  const lastRun = lastRunRecord?.startedAt ?? lastCollection._max.updatedAt;
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
          <h1>Painel administrativo</h1>
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
      <section className="admin-collector">
        <h2>Coletor automático</h2>
        <p>
          Última coleta:{" "}
          <b>{lastRun ? formatCollection(lastRun) : "Nenhuma coleta ainda"}</b>
          {lastRunRecord && (
            <>
              {" "}
              • {lastRunRecord.source} •{" "}
              <b>{RUN_STATUS[lastRunRecord.status] ?? lastRunRecord.status}</b>
            </>
          )}
        </p>
        {lastRunRecord && (
          <p>
            Resultado: <b>{lastRunRecord.upsertedCount}</b> gravados de{" "}
            <b>{lastRunRecord.fetchedCount}</b> processados
            {lastRunRecord.invalidCount > 0 && (
              <> ({lastRunRecord.invalidCount} inválidos)</>
            )}
          </p>
        )}
        {lastRunRecord?.errorMessage && (
          <p className="auth-error" role="alert">
            {lastRunRecord.errorMessage}
          </p>
        )}
        <p>
          Pendentes de revisão: <b>{symplaPending}</b>{" "}
          {symplaPending > 0 && (
            <Link href="/admin/eventos?status=pendentes">Revisar →</Link>
          )}
        </p>
        <small>
          A coleta roda automaticamente a cada 6 horas pelo Docker (serviço
          collector). Para rodar agora:{" "}
          <code>
            docker compose run --rm -e COLLECTOR_INTERVAL_HOURS=0 collector
          </code>
        </small>
      </section>
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
                {event.venueName} •{" "}
                {event.isPublished ? "Publicado" : "Rascunho"}
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
