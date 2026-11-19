import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions";
import { AdminConfirmButton } from "@/components/admin-confirm-button";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/session";

export const dynamic = "force-dynamic";

const NAME_MAX = 40;
const ICON_MAX = 8;

const errors: Record<string, string> = {
  dados: `Confira os dados: nome com 2 a ${NAME_MAX} caracteres e ícone com 1 a ${ICON_MAX}.`,
  existe: "Já existe uma categoria com esse nome.",
};

function confirmMessage(name: string, events: number) {
  return events > 0
    ? `Excluir "${name}"? ${events} ${events === 1 ? "evento ficará" : "eventos ficarão"} sem categoria. Isso não pode ser desfeito.`
    : `Excluir "${name}"? Isso não pode ser desfeito.`;
}

export default async function AdminCategories({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireAdminPage("/admin/categorias");
  const { erro } = await searchParams;
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });

  return (
    <div className="admin-page shell page-space">
      <div className="admin-heading">
        <div>
          <h1>Categorias</h1>
          <span>
            {categories.length}{" "}
            {categories.length === 1 ? "categoria" : "categorias"}
          </span>
        </div>
      </div>
      {erro && errors[erro] && (
        <p className="auth-error" role="alert">
          {errors[erro]}
        </p>
      )}
      <form
        className="admin-inline-form admin-create"
        action={createCategoryAction}
      >
        <input
          name="icon"
          placeholder="Ícone"
          aria-label="Ícone (emoji)"
          maxLength={ICON_MAX}
          required
          className="admin-icon-input"
        />
        <input
          name="name"
          placeholder="Nome da nova categoria"
          aria-label="Nome da nova categoria"
          minLength={2}
          maxLength={NAME_MAX}
          required
        />
        <button className="gradient-button" type="submit">
          Criar categoria
        </button>
      </form>
      <div className="admin-list">
        {categories.map((category) => (
          <article key={category.id} className="admin-edit-row">
            <form
              className="admin-inline-form"
              action={updateCategoryAction.bind(null, category.id)}
            >
              <input
                name="icon"
                defaultValue={category.icon}
                aria-label={`Ícone de ${category.name}`}
                maxLength={ICON_MAX}
                required
                className="admin-icon-input"
              />
              <input
                name="name"
                defaultValue={category.name}
                aria-label={`Nome de ${category.name}`}
                minLength={2}
                maxLength={NAME_MAX}
                required
              />
              <button type="submit">Salvar</button>
            </form>
            <small>
              /{category.slug} • {category._count.events}{" "}
              {category._count.events === 1 ? "evento" : "eventos"}
            </small>
            <form action={deleteCategoryAction.bind(null, category.id)}>
              <AdminConfirmButton
                className="admin-danger"
                message={confirmMessage(category.name, category._count.events)}
              >
                Excluir
              </AdminConfirmButton>
            </form>
          </article>
        ))}
        {categories.length === 0 && <p>Nenhuma categoria cadastrada.</p>}
      </div>
    </div>
  );
}
