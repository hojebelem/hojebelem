import { AuthCard } from "@/components/auth-card";
import { googleEnabled, passwordResetEnabled } from "@/lib/env";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string;
    error?: string;
    aviso?: string;
    callbackUrl?: string;
  }>;
}) {
  const { erro, error, aviso, callbackUrl } = await searchParams;
  return (
    <div className="auth-page">
      <AuthCard
        mode="login"
        error={erro ?? (error ? "oauth" : undefined)}
        notice={aviso}
        callbackUrl={callbackUrl}
        google={googleEnabled}
        passwordReset={passwordResetEnabled}
      />
    </div>
  );
}
