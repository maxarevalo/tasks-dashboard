import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { sections } from "@/lib/nav";
import { getActiveProfile } from "@/lib/profile";

export default async function TrabajoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { active, profiles } = await getActiveProfile();

  return (
    <DashboardShell
      section={sections.trabajo}
      user={session.user}
      profiles={profiles}
      activeProfileKey={active.key}
    >
      {children}
    </DashboardShell>
  );
}
