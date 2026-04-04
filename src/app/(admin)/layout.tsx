import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <Sidebar
        userName={session.user?.name ?? ""}
        userEmail={session.user?.email ?? ""}
        userRole={(session.user as { role?: string }).role ?? "MEMBER"}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
