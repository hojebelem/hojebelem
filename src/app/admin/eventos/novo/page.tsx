import { createEventAction } from "@/app/actions";
import { AdminEventForm } from "@/components/admin-event-form";
import { getCategories } from "@/lib/data";
import { requireAdminPage } from "@/lib/session";

export default async function NewEvent({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireAdminPage("/admin/eventos/novo");
  const { erro } = await searchParams;
  const categories = await getCategories();
  return (
    <div className="admin-page shell page-space">
      <div className="page-intro">
        <p>NOVO EVENTO</p>
        <h1>Publique um rolê</h1>
        <span>Preencha o essencial. Você poderá editar depois.</span>
      </div>
      <AdminEventForm
        categories={categories}
        action={createEventAction}
        error={erro}
      />
    </div>
  );
}
