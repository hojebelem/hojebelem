import { AuthCard } from "@/components/auth-card";
import { googleEnabled } from "@/lib/env";

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; callbackUrl?: string }>;
}) {
  const { erro, callbackUrl } = await searchParams;
  return (
    <div className="auth-page">
      <AuthCard
        mode="cadastro"
        error={erro}
        callbackUrl={callbackUrl}
        google={googleEnabled}
      />
    </div>
  );
}
