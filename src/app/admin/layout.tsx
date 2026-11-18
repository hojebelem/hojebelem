import { AdminNav } from "@/components/admin-nav";
import { requireAdminPage } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage("/admin");
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
