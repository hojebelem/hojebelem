import Link from "next/link";
import { Mail } from "lucide-react";
import { requestPasswordResetAction } from "@/app/actions";
import { Logo } from "@/components/logo";
import { passwordResetEnabled } from "@/lib/env";

const errors: Record<string, string> = {
  dados: "Informe um e-mail válido.",
  tentativas: "Muitas tentativas. Espere alguns minutos e tente de novo.",
  envio: "Não foi possível enviar o e-mail agora. Tente de novo em instantes.",
  indisponivel: "Recuperação por e-mail ainda não está ativa no momento.",
};

export default async function ForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; enviado?: string }>;
}) {
  const { erro, enviado } = await searchParams;
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo />
        <h1>Esqueci minha senha</h1>
        <p>
          {passwordResetEnabled
            ? "Informe seu e-mail para receber um link de redefinição válido por 30 minutos."
            : "A recuperação automática por e-mail ainda não está configurada."}
        </p>
        {enviado === "1" && (
          <p className="form-success" role="status">
            Se existir uma conta com esse e-mail, enviamos um link para
            redefinir sua senha.
          </p>
        )}
        {erro && errors[erro] && (
          <p className="auth-error" role="alert">
            {errors[erro]}
          </p>
        )}
        {passwordResetEnabled ? (
          <form action={requestPasswordResetAction}>
            <label>
              E-mail
              <div>
                <Mail />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  required
                />
              </div>
            </label>
            <button className="gradient-button" type="submit">
              Enviar link de recuperação
            </button>
          </form>
        ) : (
          <p className="auth-switch">
            Precisa de ajuda? <Link href="/contato">Fale com a equipe</Link>
          </p>
        )}
        <p className="auth-switch">
          Lembrou a senha? <Link href="/login">Voltar para entrar</Link>
        </p>
      </div>
    </div>
  );
}
