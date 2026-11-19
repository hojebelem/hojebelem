import {
  changePasswordAction,
  deleteAccountAction,
  updateProfileAction,
} from "@/app/actions";
import { AdminConfirmButton } from "@/components/admin-confirm-button";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

const PROFILE_ERRORS: Record<string, string> = {
  dados:
    "Confira os dados: nome com 2 a 80 caracteres e URL iniciando com https:// ou /uploads/.",
  imagem: "Imagem inválida. Envie JPG, PNG ou WebP de até 5 MB.",
  limite: "Muitas alterações seguidas. Aguarde alguns minutos.",
  "senha-atual": "Senha atual incorreta.",
  "senha-nova": "A nova senha precisa ter pelo menos 8 caracteres.",
  confirmacao: 'Digite "EXCLUIR" exatamente para confirmar.',
  "ultimo-admin":
    "Você é o único administrador. Promova outro antes de excluir esta conta.",
  excluir:
    "Não foi possível transferir os eventos publicados. Promova outro administrador antes de excluir.",
};

const PROFILE_NOTICES: Record<string, string> = {
  senha: "Senha atualizada com sucesso.",
};

export default async function EditProfile({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; aviso?: string }>;
}) {
  const [session, { erro, aviso }] = await Promise.all([
    getSession(),
    searchParams,
  ]);
  if (!session?.user?.id) redirect("/login?callbackUrl=/perfil/editar");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  const hasPassword = Boolean(user.passwordHash);
  return (
    <div className="profile-page shell page-space">
      <div className="page-intro">
        <p>SEU PERFIL</p>
        <h1>Editar perfil</h1>
        <span>Atualize como seu nome e sua foto aparecem na plataforma.</span>
      </div>
      {aviso && PROFILE_NOTICES[aviso] && (
        <p className="form-success" role="status">
          {PROFILE_NOTICES[aviso]}
        </p>
      )}
      {erro && PROFILE_ERRORS[erro] && (
        <p className="auth-error" role="alert">
          {PROFILE_ERRORS[erro]}
        </p>
      )}
      <form
        className="event-form profile-edit-form"
        action={updateProfileAction}
      >
        <section>
          <label>
            Nome
            <input
              name="name"
              defaultValue={user.name ?? ""}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            Enviar nova foto
            <input
              type="file"
              name="avatarFile"
              accept="image/jpeg,image/png,image/webp"
            />
          </label>
          <div className="divider">
            <span>ou use uma URL</span>
          </div>
          <label>
            URL da foto
            <input
              type="text"
              name="avatarUrl"
              defaultValue={user.avatarUrl ?? ""}
              placeholder="https://exemplo.com/minha-foto.jpg ou /uploads/..."
            />
          </label>
          <small>
            Envie JPG, PNG ou WebP de até 5 MB. O anexo tem prioridade sobre a
            URL.
          </small>
        </section>
        <button className="gradient-button" type="submit">
          Salvar perfil
        </button>
      </form>

      <form
        className="event-form profile-edit-form"
        action={changePasswordAction}
      >
        <section>
          <h2>{hasPassword ? "Alterar senha" : "Definir senha"}</h2>
          {hasPassword && (
            <label>
              Senha atual
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                required
              />
            </label>
          )}
          <label>
            Nova senha
            <input
              type="password"
              name="newPassword"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              required
            />
          </label>
        </section>
        <button className="gradient-button" type="submit">
          {hasPassword ? "Atualizar senha" : "Criar senha"}
        </button>
      </form>

      <form
        className="event-form profile-edit-form"
        action={deleteAccountAction}
      >
        <section>
          <h2>Excluir minha conta</h2>
          <small>
            Remove permanentemente sua conta, favoritos e envios ainda não
            publicados. Esta ação não pode ser desfeita.
          </small>
          {hasPassword ? (
            <label>
              Confirme sua senha atual
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                required
              />
            </label>
          ) : (
            <label>
              Digite EXCLUIR para confirmar
              <input
                type="text"
                name="confirmText"
                placeholder="EXCLUIR"
                pattern="EXCLUIR"
                required
              />
            </label>
          )}
        </section>
        <AdminConfirmButton
          className="admin-danger"
          message="Tem certeza que deseja excluir sua conta permanentemente?"
        >
          Excluir minha conta
        </AdminConfirmButton>
      </form>
    </div>
  );
}
