import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { sections } from "@/lib/nav";
import { iconMap } from "@/lib/icons";

export default function PersonalHome() {
  const modules = sections.personal.nav.filter((item) => item.href !== "/personal");

  return (
    <div>
      <PageHeader
        title="Resumen personal"
        description="Accedé a tus módulos personales."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-900">
                  {item.label}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
