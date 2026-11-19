import { adminDeleteUserAction, updateUserRoleAction } from "@/app/actions";
import { AdminConfirmButton } from "@/components/admin-confirm-button";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const ROLES = [
  { value: "USER", label: "Usuário" },
  { value: "ORGANIZER", label: "Organizador" },
  { value: "ADMIN", label: "Admin" },
] as const;

const errors: Record<string, string> = {
  proprio: "Você não pode tirar o seu próprio papel de Admin.",
  "excluir-proprio": "Use Editar perfil para excluir sua própria conta.",
  "ultimo-admin": "O sistema precisa ter pelo menos um Admin.",
  excluir: "Não foi possível excluir este usuário.",
  dados: "Papel inválido.",
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Belem",
  dateStyle: "short",
});

function listHref(q: string, pagina = 1) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (pagina > 1) params.set("pagina", String(pagina));
  const query = params.toString();
  return query ? `/admin/usuarios?${query}` : "/admin/usuarios";
}

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; erro?: string }>;
}) {
  const currentAdmin = await requireAdminPage("/admin/usuarios");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(
    Math.max(1, Math.floor(Number(params.pagina)) || 1),
    totalPages,
  );
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="admin-page shell page-space">
      <div className="admin-heading">
        <div>
          <p>PESSOAS</p>
          <h1>Usuários</h1>
          <span>
            {total} {total === 1 ? "usuário" : "usuários"} • alterações de papel
            de administrador passam a valer imediatamente.
          </span>
        </div>
      </div>
      {params.erro && errors[params.erro] && (
        <p className="auth-error" role="alert">
          {errors[params.erro]}
        </p>
      )}
      <form className="admin-filters" action="/admin/usuarios">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar por nome ou e-mail"
        />
        <button type="submit">Buscar</button>
        {q && <Link href={listHref("")}>Limpar</Link>}
      </form>
      <div className="admin-list">
        {users.map((user) => (
          <article key={user.id} className="admin-edit-row">
            <div>
              <b>{user.name}</b>
              <small>
                {user.email} • desde {dateFormat.format(user.createdAt)}
              </small>
            </div>
            <div className="admin-user-actions">
              <form
                className="admin-inline-form"
                action={updateUserRoleAction.bind(null, user.id)}
              >
                <select
                  name="role"
                  defaultValue={user.role}
                  aria-label={`Papel de ${user.name}`}
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <button type="submit">Salvar</button>
              </form>
              {user.id !== currentAdmin.id && (
                <form action={adminDeleteUserAction.bind(null, user.id)}>
                  <AdminConfirmButton
                    className="admin-danger"
                    message={`Excluir a conta de "${user.name ?? user.email}"? Os favoritos e envios não publicados serão removidos.`}
                  >
                    Excluir
                  </AdminConfirmButton>
                </form>
              )}
            </div>
          </article>
        ))}
        {users.length === 0 && <p>Nenhum usuário encontrado.</p>}
      </div>
      {total > 0 && (
        <nav className="admin-pagination" aria-label="Paginação">
          {page > 1 ? (
            <Link href={listHref(q, page - 1)}>Anterior</Link>
          ) : (
            <span>Anterior</span>
          )}
          <p>
            {from}–{to} de {total}
          </p>
          {page < totalPages ? (
            <Link href={listHref(q, page + 1)}>Próxima</Link>
          ) : (
            <span>Próxima</span>
          )}
        </nav>
      )}
    </div>
  );
}
