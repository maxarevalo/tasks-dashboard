import Link from "next/link";
import { ChevronRight, Plus, Check, HandCoins, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { sections } from "@/lib/nav";
import { iconMap } from "@/lib/icons";
import { SHORTCUTS } from "@/lib/shortcuts";
import { getUpcomingMaturities } from "@/features/vencimientos/queries";
import { MaturityRow } from "@/components/notifications-bell";

export const dynamic = "force-dynamic";

/** Ícono y tono de cada acceso directo: oscuro para gastos, verde para ingresos. */
const SHORTCUT_STYLE = {
  "cargar-gasto": { Icon: Plus, tone: "bg-slate-900 text-white" },
  "pagar-gasto": { Icon: Check, tone: "bg-slate-900 text-white" },
  "cargar-ingreso": { Icon: Plus, tone: "bg-teal-700 text-white" },
  "cobrar-ingreso": { Icon: HandCoins, tone: "bg-teal-700 text-white" },
} as const;

export default async function PersonalHome() {
  const modules = sections.personal.nav.filter((item) => item.href !== "/personal");
  const { items, daysBefore } = await getUpcomingMaturities();

  return (
    <div>
      <PageHeader
        title="Resumen personal"
        description="Accedé a tus módulos personales."
      />

      {items.length > 0 && (
        <section
          aria-labelledby="vencimientos"
          className="mb-8 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm"
        >
          <h3
            id="vencimientos"
            className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900"
          >
            <CalendarClock className="h-4 w-4" />
            Próximos vencimientos
          </h3>
          <ul className="divide-y divide-slate-100">
            {items.map((i) => (
              <MaturityRow key={i.key} item={i} highlight={i.daysLeft <= daysBefore} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="accesos" className="mb-8">
        <h3
          id="accesos"
          className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Accesos rápidos
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SHORTCUTS.map((sc) => {
            const { Icon, tone } = SHORTCUT_STYLE[sc.key];
            return (
              <Link
                key={sc.key}
                href={sc.href}
                className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {sc.name}
                  </span>
                  <span className="block text-xs text-slate-500">{sc.hint}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Módulos
      </h3>
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
