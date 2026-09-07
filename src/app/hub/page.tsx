import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { auth, signOut } from "@/auth";
import { sections } from "@/lib/nav";
import { iconMap } from "@/lib/icons";

export default async function HubPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "";

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Hola{firstName ? `, ${firstName}` : ""} 👋</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              ¿A dónde querés entrar?
            </h1>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              Cerrar sesión
            </button>
          </form>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {Object.values(sections).map((section) => {
            const Icon = iconMap[section.icon];
            return (
              <Link
                key={section.key}
                href={section.href}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${section.accent} text-white`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-slate-900">
                    {section.label}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-slate-900">
                  Entrar
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
