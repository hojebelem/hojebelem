import Link from "next/link";
import { resetPasswordAction } from "@/app/actions";
import { Logo } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";
import { parseResetToken } from "@/lib/password-reset";

const errors: Record<string, string> = {
  dados: "A nova senha precisa ter pelo menos 8 caracteres.",
  token: "Este link expirou ou já foi usado. Peça um novo.",
  tentativas: "Muitas tentativas. Espere alguns minutos e tente de novo.",
};

export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; erro?: string }>;
}) {
  const { token, erro } = await searchParams;
  const tokenValid = Boolean(token && parseResetToken(token));

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo />
        <h1>Redefinir senha</h1>
        <p>Escolha uma nova senha com 8 ou mais caracteres.</p>
        {erro && errors[erro] && (
          <p className="auth-error" role="alert">
            {errors[erro]}
          </p>
        )}
        {tokenValid && token ? (
          <form action={resetPasswordAction}>
            <input type="hidden" name="token" value={token} />
            <label>
              Nova senha
              <PasswordInput autoComplete="new-password" />
            </label>
            <button className="gradient-button" type="submit">
              Salvar nova senha
            </button>
          </form>
        ) : (
          !erro && (
            <p className="auth-error" role="alert">
              Link inválido ou expirado. Peça um novo link de recuperação.
            </p>
          )
        )}
        <p className="auth-switch">
          <Link href="/esqueci-senha">Pedir novo link</Link> •{" "}
          <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
