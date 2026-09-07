import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { sections } from "@/lib/nav";

export default async function TrabajoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <DashboardShell section={sections.trabajo} user={session.user}>
      {children}
    </DashboardShell>
  );
}
