import { AuthCard } from "@/components/auth-card";
import { googleEnabled, passwordResetEnabled } from "@/lib/env";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; aviso?: string; callbackUrl?: string }>;
}) {
  const { erro, aviso, callbackUrl } = await searchParams;
  return (
    <div className="auth-page">
      <AuthCard
        mode="login"
        error={erro}
        notice={aviso}
        callbackUrl={callbackUrl}
        google={googleEnabled}
        passwordReset={passwordResetEnabled}
      />
    </div>
  );
}
