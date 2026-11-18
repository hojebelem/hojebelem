import {
  approveEventAction,
  deleteEventAction,
  rejectEventAction,
  restoreEventAction,
  toggleEventPublishedAction,
} from "@/app/actions";
import { AdminConfirmButton } from "@/components/admin-confirm-button";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const PENDING_PREVIEW = 10;

const STATUS_TABS = [
  { value: "todos", label: "Todos" },
  { value: "publicados", label: "Publicados" },
  { value: "rascunhos", label: "Rascunhos" },
  { value: "pendentes", label: "Pendentes" },
  { value: "descartados", label: "Descartados" },
] as const;
type Status = (typeof STATUS_TABS)[number]["value"];

// vindos do coletor e ainda sem revisão do admin
const pendingWhere: Prisma.EventWhereInput = {
  source: { not: "manual" },
  reviewedAt: null,
  rejectedAt: null,
};

const statusWhere: Record<Status, Prisma.EventWhereInput> = {
  // os pendentes aparecem à parte, no topo
  todos: {
    rejectedAt: null,
    NOT: { source: { not: "manual" }, reviewedAt: null },
  },
  publicados: { rejectedAt: null, isPublished: true },
  rascunhos: { rejectedAt: null, isPublished: false },
  pendentes: pendingWhere,
  descartados: { rejectedAt: { not: null } },
};

const include = {
  categories: { include: { category: true } },
} satisfies Prisma.EventInclude;
type EventRow = Prisma.EventGetPayload<{ include: typeof include }>;

function listHref(q: string, status: Status, pagina = 1) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "todos") params.set("status", status);
  if (pagina > 1) params.set("pagina", String(pagina));
  const query = params.toString();
  return query ? `/admin/eventos?${query}` : "/admin/eventos";
}

// evento do coletor apagado voltaria na próxima coleta; para ele só "Descartar"
function RemoveButton({ event }: { event: EventRow }) {
  if (event.source === "sympla")
    return (
      <form action={rejectEventAction.bind(null, event.id)}>
        <button type="submit">Descartar</button>
      </form>
    );
  return (
    <form action={deleteEventAction.bind(null, event.id)}>
      <AdminConfirmButton className="admin-danger">Excluir</AdminConfirmButton>
    </form>
  );
}

function PendingRow({ event }: { event: EventRow }) {
  return (
    <article>
      <span>{event.categories[0]?.category.icon ?? "✦"}</span>
      <div>
        <b>{event.title}</b>
        <small>
          {event.venueName} • vindo da {event.source}
        </small>
      </div>
      <div className="admin-row-actions">
        <form action={approveEventAction.bind(null, event.id)}>
          <button type="submit">Aprovar</button>
        </form>
        <Link href={`/admin/eventos/${event.id}/editar`}>Revisar</Link>
        <form action={rejectEventAction.bind(null, event.id)}>
          <button type="submit">Descartar</button>
        </form>
      </div>
    </article>
  );
}

function EventListRow({ event }: { event: EventRow }) {
  const discarded = event.rejectedAt !== null;
  return (
    <article>
      <span>{event.categories[0]?.category.icon ?? "✦"}</span>
      <div>
        <b>{event.title}</b>
        <small>
          {event.venueName} •{" "}
          {discarded
            ? "Descartado"
            : event.isPublished
              ? "Publicado"
              : "Rascunho"}
        </small>
      </div>
      <div className="admin-row-actions">
        {discarded ? (
          <form action={restoreEventAction.bind(null, event.id)}>
            <button type="submit">Restaurar</button>
          </form>
        ) : (
          <form action={toggleEventPublishedAction.bind(null, event.id)}>
            <button type="submit">
              {event.isPublished ? "Despublicar" : "Publicar"}
            </button>
          </form>
        )}
        <Link href={`/admin/eventos/${event.id}/editar`}>Editar</Link>
        {/* descartado do coletor fica guardado, senão a coleta o traria de volta */}
        {!(discarded && event.source === "sympla") && (
          <RemoveButton event={event} />
        )}
      </div>
    </article>
  );
}

export default async function AdminEvents({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; pagina?: string }>;
}) {
  await requireAdminPage("/admin/eventos");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status =
    STATUS_TABS.find((tab) => tab.value === params.status)?.value ?? "todos";
  const search: Prisma.EventWhereInput = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { venueName: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const where: Prisma.EventWhereInput = {
    AND: [statusWhere[status], search],
  };

  const [total, pending] = await Promise.all([
    prisma.event.count({ where }),
    status === "todos"
      ? prisma.event.findMany({
          where: { AND: [pendingWhere, search] },
          include,
          orderBy: { updatedAt: "desc" },
          // o resto fica na aba Pendentes, paginada
          take: PENDING_PREVIEW,
        })
      : [],
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(
    Math.max(1, Math.floor(Number(params.pagina)) || 1),
    totalPages,
  );
  const events = await prisma.event.findMany({
    where,
    include,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="admin-page shell page-space">
      <div className="admin-heading">
        <div>
          <p>CONTEÚDO</p>
          <h1>Eventos</h1>
          <span>
            {total} {total === 1 ? "evento" : "eventos"}
          </span>
        </div>
        <Link className="gradient-button" href="/admin/eventos/novo">
          <Plus /> Novo evento
        </Link>
      </div>
      <form className="admin-filters" action="/admin/eventos">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título ou local"
          aria-label="Buscar por título ou local"
        />
        {status !== "todos" && (
          <input type="hidden" name="status" value={status} />
        )}
        <button type="submit">Buscar</button>
        {q && <Link href={listHref("", status)}>Limpar</Link>}
      </form>
      <div className="admin-tabs">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={listHref(q, tab.value)}
            className={tab.value === status ? "active" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {pending.length > 0 && (
        <>
          <h2 className="admin-section-title">Pendentes de revisão</h2>
          <div className="admin-list">
            {pending.map((event) => (
              <PendingRow key={event.id} event={event} />
            ))}
          </div>
          {pending.length === PENDING_PREVIEW && (
            <Link className="admin-more" href={listHref(q, "pendentes")}>
              Ver todos os pendentes →
            </Link>
          )}
          <h2 className="admin-section-title">Todos os eventos</h2>
        </>
      )}
      <div className="admin-list">
        {events.map((event) =>
          status === "pendentes" ? (
            <PendingRow key={event.id} event={event} />
          ) : (
            <EventListRow key={event.id} event={event} />
          ),
        )}
        {events.length === 0 && <p>Nenhum evento encontrado.</p>}
      </div>
      {total > 0 && (
        <nav className="admin-pagination" aria-label="Paginação">
          {page > 1 ? (
            <Link href={listHref(q, status, page - 1)}>Anterior</Link>
          ) : (
            <span>Anterior</span>
          )}
          <p>
            {from}–{to} de {total}
          </p>
          {page < totalPages ? (
            <Link href={listHref(q, status, page + 1)}>Próxima</Link>
          ) : (
            <span>Próxima</span>
          )}
        </nav>
      )}
    </div>
  );
}
