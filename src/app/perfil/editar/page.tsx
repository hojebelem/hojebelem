import { updateProfileAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

const PROFILE_ERRORS: Record<string, string> = {
  dados:
    "Confira os dados: nome com 2 a 80 caracteres e URL iniciando com https:// ou /uploads/.",
  imagem: "Imagem inválida. Envie JPG, PNG ou WebP de até 5 MB.",
  limite: "Muitas alterações seguidas. Aguarde alguns minutos.",
};

export default async function EditProfile({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const [session, { erro }] = await Promise.all([getSession(), searchParams]);
  if (!session?.user?.id) redirect("/login?callbackUrl=/perfil/editar");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  return (
    <div className="profile-page shell page-space">
      <div className="page-intro">
        <p>SEU PERFIL</p>
        <h1>Editar perfil</h1>
        <span>Atualize como seu nome e sua foto aparecem na plataforma.</span>
      </div>
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
    </div>
  );
}
