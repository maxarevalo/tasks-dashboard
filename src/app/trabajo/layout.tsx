import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { sections } from "@/lib/nav";
import { getActiveProfile } from "@/lib/profile";
import { getUpcomingMaturities } from "@/features/vencimientos/queries";

export default async function TrabajoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [{ active, profiles }, alerts] = await Promise.all([
    getActiveProfile(),
    getUpcomingMaturities(),
  ]);

  return (
    <DashboardShell
      section={sections.trabajo}
      user={session.user}
      profiles={profiles}
      activeProfileKey={active.key}
      alerts={alerts}
      vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
    >
      {children}
    </DashboardShell>
  );
}
