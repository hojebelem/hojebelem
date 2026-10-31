import {
  approveEventAction,
  rejectEventAction,
  toggleEventPublishedAction,
} from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminEvents() {
  const all = await prisma.event.findMany({
    where: { rejectedAt: null },
    include: { categories: { include: { category: true } } },
    orderBy: { updatedAt: "desc" },
  });
  // vindos do coletor e ainda sem revisão do admin
  const isPending = (e: (typeof all)[number]) =>
    e.source !== "manual" && !e.reviewedAt;
  const pending = all.filter(isPending);
  const events = all.filter((e) => !isPending(e));
  return (
    <div className="admin-page shell page-space">
      <div className="admin-heading">
        <div>
          <p>CONTEÚDO</p>
          <h1>Eventos</h1>
          <span>{events.length} eventos cadastrados</span>
        </div>
        <Link className="gradient-button" href="/admin/eventos/novo">
          <Plus /> Novo evento
        </Link>
      </div>
      {pending.length > 0 && (
        <>
          <h2 className="admin-section-title">
            Pendentes de revisão ({pending.length})
          </h2>
          <div className="admin-list">
            {pending.map((event) => (
              <article key={event.id}>
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
                  <Link href={`/admin/eventos/${event.id}/editar`}>
                    Revisar
                  </Link>
                  <form action={rejectEventAction.bind(null, event.id)}>
                    <button type="submit">Descartar</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
          <h2 className="admin-section-title">Todos os eventos</h2>
        </>
      )}
      <div className="admin-list">
        {events.map((event) => {
          const toggle = toggleEventPublishedAction.bind(null, event.id);
          return (
            <article key={event.id}>
              <span>{event.categories[0]?.category.icon ?? "✦"}</span>
              <div>
                <b>{event.title}</b>
                <small>
                  {event.venueName} •{" "}
                  {event.isPublished ? "Publicado" : "Rascunho"}
                </small>
              </div>
              <div className="admin-row-actions">
                <form action={toggle}>
                  <button type="submit">
                    {event.isPublished ? "Despublicar" : "Publicar"}
                  </button>
                </form>
                <Link href={`/admin/eventos/${event.id}/editar`}>Editar</Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
