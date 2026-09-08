import type { IconName } from "@/lib/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Marca módulos todavía no desarrollados. */
  soon?: boolean;
};

export type Section = {
  key: "personal" | "trabajo";
  label: string;
  description: string;
  href: string;
  icon: IconName;
  accent: string;
  nav: NavItem[];
};

export const sections: Record<Section["key"], Section> = {
  personal: {
    key: "personal",
    label: "Personal",
    description: "Tu vida fuera del trabajo: finanzas, tareas y más.",
    href: "/personal",
    icon: "user",
    accent: "from-emerald-500 to-teal-600",
    nav: [
      { label: "Resumen", href: "/personal", icon: "layout-dashboard" },
      { label: "Gastos mensuales", href: "/personal/gastos", icon: "receipt" },
      { label: "Estado contable", href: "/personal/estado-contable", icon: "wallet" },
      { label: "Tareas pendientes", href: "/personal/tareas", icon: "list-checks" },
    ],
  },
  trabajo: {
    key: "trabajo",
    label: "Trabajo",
    description: "Todo lo relacionado con tu actividad laboral.",
    href: "/trabajo",
    icon: "briefcase",
    accent: "from-indigo-500 to-violet-600",
    nav: [{ label: "Resumen", href: "/trabajo", icon: "layout-dashboard" }],
  },
};
