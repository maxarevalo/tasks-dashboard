/**
 * Accesos directos a los flujos más usados. Se usan en el manifest de la PWA
 * (mantener apretado el ícono) y en el Resumen de Personal.
 */
export const SHORTCUTS = [
  {
    key: "cargar-gasto",
    name: "Cargar un gasto",
    short: "Cargar gasto",
    hint: "Tarjeta, préstamo, fijo o previsto",
    href: "/personal/gastos?accion=cargar",
    icon: "/icons/shortcuts/cargar-gasto.png",
  },
  {
    key: "pagar-gasto",
    name: "Pagar un gasto",
    short: "Pagar gasto",
    hint: "Lo pendiente del mes, desde una cuenta",
    href: "/personal/gastos?accion=pagar",
    icon: "/icons/shortcuts/pagar-gasto.png",
  },
  {
    key: "cargar-ingreso",
    name: "Cargar un ingreso",
    short: "Cargar ingreso",
    hint: "Recurrente o único",
    href: "/personal/estado-contable/ingresos?accion=cargar",
    icon: "/icons/shortcuts/cargar-ingreso.png",
  },
  {
    key: "cobrar-ingreso",
    name: "Cobrar un ingreso",
    short: "Cobrar ingreso",
    hint: "Monto real y a qué cuenta entró",
    href: "/personal/estado-contable/ingresos?accion=cobrar",
    icon: "/icons/shortcuts/cobrar-ingreso.png",
  },
] as const;
