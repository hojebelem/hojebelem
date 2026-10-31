import { AuthCard } from "@/components/auth-card";
import { googleEnabled } from "@/lib/env";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; callbackUrl?: string }>;
}) {
  const { erro, callbackUrl } = await searchParams;
  return (
    <div className="auth-page">
      <AuthCard
        mode="login"
        error={erro}
        callbackUrl={callbackUrl}
        google={googleEnabled}
      />
    </div>
  );
}
