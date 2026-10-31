import { AuthCard } from "@/components/auth-card";
import { googleEnabled } from "@/lib/env";

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div className="auth-page">
      <AuthCard mode="cadastro" error={erro} google={googleEnabled} />
    </div>
  );
}
