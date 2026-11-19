import {
  deleteEventAction,
  rejectEventAction,
  updateEventAction,
} from "@/app/actions";
import { AdminConfirmButton } from "@/components/admin-confirm-button";
import { AdminEventForm } from "@/components/admin-event-form";
import { isCollectorSource } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/session";
import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";

export default async function EditEvent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  await requireAdminPage(`/admin/eventos/${id}/editar`);
  const { erro } = await searchParams;
  const [event, categories] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { categories: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!event) notFound();
  const action = updateEventAction.bind(null, event.id);
  return (
    <div className="admin-page shell page-space">
      <div className="page-intro">
        <h1>{event.title}</h1>
      </div>
      <AdminEventForm
        categories={categories}
        action={action}
        error={erro}
        event={{
          slug: event.slug,
          title: event.title,
          description: event.description,
          categoryId: event.categories[0]?.categoryId ?? "",
          startAt: formatInTimeZone(
            event.startAt,
            "America/Belem",
            "yyyy-MM-dd'T'HH:mm",
          ),
          endAt: event.endAt
            ? formatInTimeZone(
                event.endAt,
                "America/Belem",
                "yyyy-MM-dd'T'HH:mm",
              )
            : "",
          venueName: event.venueName,
          address: event.address,
          coverImageUrl: event.coverImageUrl,
          externalPurchaseLink: event.externalPurchaseLink,
          socialLink: event.socialLink ?? "",
          price: event.price?.toString() ?? "",
          statusOverride: event.statusOverride,
          isPublished: event.isPublished,
          isFeatured: event.isFeatured,
        }}
      />
      {/* fora do formulário principal: <form> não pode ficar dentro de <form> */}
      <div className="admin-danger-zone">
        {isCollectorSource(event.source) ? (
          // apagar faria o coletor trazer o evento de volta; descartar impede isso
          <form action={rejectEventAction.bind(null, event.id)}>
            <input type="hidden" name="voltar" value="lista" />
            <AdminConfirmButton message="Descartar este evento? Ele sai da lista e o coletor não o traz de volta.">
              Descartar
            </AdminConfirmButton>
          </form>
        ) : (
          <form action={deleteEventAction.bind(null, event.id)}>
            <input type="hidden" name="voltar" value="lista" />
            <AdminConfirmButton>Excluir</AdminConfirmButton>
          </form>
        )}
      </div>
    </div>
  );
}
