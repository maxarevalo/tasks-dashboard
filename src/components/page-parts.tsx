import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

export function PageHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      {Icon && (
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
    </div>
  );
}

export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && (
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      )}
      {children}
    </section>
  );
}

export function ComingSoon({ note }: { note?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <Construction className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-medium text-slate-900">
        Módulo en construcción
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        {note ?? "Todavía no hay nada acá. Lo vamos a ir armando de a poco."}
      </p>
    </div>
  );
}
