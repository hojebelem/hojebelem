import Link from "next/link";
import { Mail, UserRound } from "lucide-react";
import { Logo } from "./logo";
import { PasswordInput } from "./password-input";
import { googleAction, loginAction, registerAction } from "@/app/actions";

const errors: Record<string, string> = {
  credenciais: "E-mail ou senha incorretos. Confira e tente de novo.",
  email: "Esse e-mail já tem cadastro. Entre ou use outro e-mail.",
  dados: "Confira os dados: nome com 2+ letras e senha com 8+ caracteres.",
};

export function AuthCard({
  mode,
  error,
  callbackUrl,
  google,
}: {
  mode: "login" | "cadastro";
  error?: string;
  callbackUrl?: string;
  google: boolean;
}) {
  const signup = mode === "cadastro";
  return (
    <div className="auth-card">
      <Logo />
      <p className="eyebrow">{signup ? "FAÇA PARTE" : "BEM-VINDO DE VOLTA"}</p>
      <h1>{signup ? "Crie sua conta" : "Entre e viva mais Belém."}</h1>
      <p>
        {signup
          ? "Salve seus rolês favoritos e descubra novas experiências."
          : "Seus eventos favoritos estão esperando por você."}
      </p>
      {error && errors[error] && (
        <p className="auth-error" role="alert">
          {errors[error]}
        </p>
      )}
      <form action={signup ? registerAction : loginAction}>
        {callbackUrl && (
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
        )}
        {signup && (
          <label>
            Nome
            <div>
              <UserRound />
              <input
                name="name"
                autoComplete="name"
                placeholder="Como podemos te chamar?"
                required
              />
            </div>
          </label>
        )}
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
        <label>
          Senha
          <PasswordInput
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </label>
        <button className="gradient-button" type="submit">
          {signup ? "Criar conta" : "Entrar"}
        </button>
      </form>
      {google && (
        <>
          <div className="divider">
            <span>ou</span>
          </div>
          <form action={googleAction}>
            <button className="google-button" type="submit">
              <b>G</b> Continuar com Google
            </button>
          </form>
        </>
      )}
      <p className="auth-switch">
        {signup ? "Já tem uma conta? " : "Ainda não tem uma conta? "}
        <Link href={signup ? "/login" : "/cadastro"}>
          {signup ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </div>
  );
}
