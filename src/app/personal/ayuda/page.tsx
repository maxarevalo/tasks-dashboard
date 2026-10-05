import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Card, PageHeader } from "@/components/page-parts";
import { SHORTCUTS } from "@/lib/shortcuts";
import { MoneyMap } from "./_components/money-map";

type Where = { label: string; href: string };

type UseCase = {
  name: string;
  detail?: string;
  where: Where[];
  /** Qué pasa con el saldo de las cuentas de ahorro. */
  accounts: string;
  /** Qué pasa con el gasto o ingreso involucrado. */
  item: string;
  /** Qué pasa con la proyección / disponible. */
  projection: string;
};

const GASTOS = { label: "Gastos", href: "/personal/gastos" };
const FIJOS = { label: "Gastos › Gastos fijos", href: "/personal/gastos/fijos" };
const PRESUPUESTO = { label: "Gastos › Presupuesto", href: "/personal/gastos" };
const INGRESOS = {
  label: "Estado contable › Ingresos",
  href: "/personal/estado-contable/ingresos",
};
const AHORROS = {
  label: "Estado contable › Ahorros",
  href: "/personal/estado-contable/ahorros",
};
const CIERRE = {
  label: "Estado contable › Cierre de mes",
  href: "/personal/estado-contable/cierre",
};

const GROUPS: { title: string; hint: string; rows: UseCase[] }[] = [
  {
    title: "Planificar",
    hint: "Cargar lo que va a pasar. No mueve plata.",
    rows: [
      {
        name: "Cargar un gasto",
        detail: "Tarjeta, préstamo, fijo o previsto; en cuotas; o importando el resumen.",
        where: [GASTOS],
        accounts: "Sin cambios",
        item: "Gasto nuevo, pendiente",
        projection: "Lo resta en su mes",
      },
      {
        name: "Gastos fijos",
        detail: "Alquiler, servicios, suscripciones.",
        where: [FIJOS],
        accounts: "Sin cambios",
        item: "Se cargan solos cada mes",
        projection: "Resta el estimado hasta que se cargue",
      },
      {
        name: "Presupuesto por etiqueta",
        detail: "Ej. combustible o supermercado: un tope para el mes.",
        where: [PRESUPUESTO],
        accounts: "Sin cambios",
        item: "Los gastos de esa etiqueta lo van descontando",
        projection: "Resta lo que queda disponible",
      },
      {
        name: "Cargar un ingreso",
        detail: "Sueldo, honorarios, alquileres cobrados; recurrente o único.",
        where: [INGRESOS],
        accounts: "Sin cambios",
        item: "Ingreso por cobrar",
        projection: "Lo suma en sus meses",
      },
      {
        name: "Crear una cuenta",
        detail: "Caja de ahorro, FCI, efectivo, dólares…",
        where: [AHORROS],
        accounts: "Cuenta nueva con su saldo",
        item: "—",
        projection: "Es el punto de partida",
      },
    ],
  },
  {
    title: "Mover plata",
    hint: "Lo que pasó de verdad. Cambia el saldo de las cuentas.",
    rows: [
      {
        name: "Pagar un gasto",
        detail: "Uno solo o varios con “Pagar (n)”. Cada gasto se paga en su moneda.",
        where: [GASTOS],
        accounts: "− el monto pagado (movimiento “Pago”)",
        item: "Pagado, aunque se haya pagado menos",
        projection: "Deja de restarlo",
      },
      {
        name: "Marcar pagado sin descontar",
        detail: "Para pagos que ya están reflejados en el saldo.",
        where: [{ label: "Gastos › Pagar", href: "/personal/gastos" }],
        accounts: "Sin cambios",
        item: "Pagado",
        projection: "Deja de restarlo",
      },
      {
        name: "Cobrar un ingreso",
        detail: "Monto real, repartido en una o más cuentas.",
        where: [{ label: "Ingresos › Cobrar", href: INGRESOS.href }],
        accounts: "+ lo cobrado (movimiento “Cobro” en cada cuenta)",
        item: "Ese mes queda cobrado",
        projection: "Deja de sumar el estimado",
      },
      {
        name: "Transferir",
        detail: "Entre cuentas, incluso ARS ↔ USD (compra de dólares).",
        where: [{ label: "Ahorros › Transferir", href: AHORROS.href }],
        accounts: "− en el origen, + en el destino",
        item: "—",
        projection: "Igual, salvo por la conversión",
      },
    ],
  },
  {
    title: "Corregir",
    hint: "Deshacer o ajustar. Todo deja rastro en Movimientos.",
    rows: [
      {
        name: "Desmarcar un pago",
        where: [GASTOS],
        accounts: "+ vuelve la plata a la cuenta",
        item: "Pendiente otra vez",
        projection: "Vuelve a restarlo",
      },
      {
        name: "Deshacer un cobro",
        where: [INGRESOS],
        accounts: "− sale lo que había entrado",
        item: "Por cobrar otra vez",
        projection: "Vuelve a sumar el estimado",
      },
      {
        name: "Deshacer una transferencia",
        where: [{ label: "Ahorros › Movimientos", href: AHORROS.href }],
        accounts: "Revierte ambas cuentas",
        item: "—",
        projection: "Como estaba",
      },
      {
        name: "Editar el saldo a mano",
        where: [{ label: "Ahorros › Editar", href: AHORROS.href }],
        accounts: "Saldo nuevo (movimiento “Ajuste” por la diferencia)",
        item: "—",
        projection: "Cambia por la diferencia",
      },
    ],
  },
  {
    title: "Controlar",
    hint: "Comparar lo registrado contra la realidad.",
    rows: [
      {
        name: "Cierre de mes",
        detail: "Cargás el saldo real de cada cuenta.",
        where: [CIERRE],
        accounts: "Quedan con su saldo real (“Pago No registrado” o “Ajuste”)",
        item: "Si falta plata: gasto pagado “No registrado” (etiqueta Otros)",
        projection: "Parte de los saldos reales",
      },
      {
        name: "Revisar y analizar",
        detail: "Tabla mensual, estadísticas, evolución.",
        where: [
          { label: "Tabla mensual", href: "/personal/gastos/tabla" },
          { label: "Estadísticas", href: "/personal/estadisticas" },
        ],
        accounts: "Sin cambios",
        item: "Solo lectura",
        projection: "Sin cambios",
      },
    ],
  },
];

const ROUTINE: { when: string; steps: React.ReactNode }[] = [
  {
    when: "Antes del día 1",
    steps: (
      <>
        Importá el resumen de la tarjeta, generá los{" "}
        <A href={FIJOS.href}>gastos fijos</A> y revisá los presupuestos (incluido{" "}
        <em>Otros</em>).
      </>
    ),
  },
  {
    when: "Cada vez que pagás",
    steps: (
      <>
        En <A href={GASTOS.href}>Gastos</A> usá <strong>Pagar (n)</strong> y elegí
        de qué cuenta sale.
      </>
    ),
  },
  {
    when: "Cuando cobrás",
    steps: (
      <>
        En <A href={INGRESOS.href}>Ingresos</A> tocá <strong>Cobrar</strong>, poné
        el monto real y repartilo entre las cuentas.
      </>
    ),
  },
  {
    when: "Si movés plata",
    steps: (
      <>
        En <A href={AHORROS.href}>Ahorros</A> usá <strong>Transferir</strong>{" "}
        (también para comprar dólares).
      </>
    ),
  },
  {
    when: "Fin de mes",
    steps: (
      <>
        Hacé el <A href={CIERRE.href}>Cierre de mes</A>: lo que falte queda como
        gasto “No registrado”.
      </>
    ),
  },
];

const RULES: { title: string; body: string }[] = [
  {
    title: "Cada peso se cuenta una vez",
    body: "Un gasto resta en la proyección hasta que lo pagás; ahí pasa a restar del saldo de la cuenta. Nunca en los dos lados.",
  },
  {
    title: "Cada gasto se paga en su moneda",
    body: "Un gasto en USD sale de una cuenta en USD. Si necesitás dólares, primero transferí (compra) y después pagá.",
  },
  {
    title: "Pagar es definitivo",
    body: "Un pago parcial deja el gasto pagado. Si refinanciás el resto, cargalo como un gasto nuevo.",
  },
  {
    title: "Los presupuestos miran todo lo gastado",
    body: "Cualquier gasto con la etiqueta del presupuesto lo descuenta, esté pagado o no. Lo que sobra sigue restando en la proyección.",
  },
];

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
    >
      {children}
    </Link>
  );
}

function WhereLinks({ where }: { where: Where[] }) {
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
      {where.map((w) => (
        <A key={w.label} href={w.href}>
          {w.label}
        </A>
      ))}
    </span>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-6 border-t-2 ${className}`} />
      {label}
    </span>
  );
}

export default function AyudaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayuda"
        description="Cómo se relacionan ahorros, ingresos, gastos y presupuestos, y qué hace cada acción."
        icon={CircleHelp}
      />

      <Card title="Mapa del dinero">
        <p className="mb-3 text-sm text-slate-600">
          Las <strong>cuentas de ahorro</strong> tienen la plata real. Los{" "}
          <strong>gastos</strong> e <strong>ingresos</strong> cargados son lo que
          va a pasar: hasta que los pagás o cobrás solo cambian la proyección.
        </p>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <Legend className="border-teal-700" label="Mueve plata real" />
          <Legend className="border-dashed border-amber-700" label="Cierre de mes" />
          <Legend className="border-slate-400" label="Cálculo de la proyección" />
        </div>
        <div className="-mx-5 overflow-x-auto px-5">
          <MoneyMap />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Proyección = saldo actual + lo que falta cobrar − lo que falta pagar − lo
          disponible de cada presupuesto.
        </p>
      </Card>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Casos de uso</h3>
        {GROUPS.map((g) => (
          <Card key={g.title}>
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-slate-900">{g.title}</h4>
              <p className="text-xs text-slate-500">{g.hint}</p>
            </div>

            {/* Escritorio: tabla */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="text-xs text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="w-[26%] py-2 pr-3 font-medium">Qué</th>
                  <th className="w-[16%] py-2 pr-3 font-medium">Dónde</th>
                  <th className="w-[20%] py-2 pr-3 font-medium">Cuentas</th>
                  <th className="w-[20%] py-2 pr-3 font-medium">Gasto / ingreso</th>
                  <th className="py-2 font-medium">Proyección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {g.rows.map((r) => (
                  <tr key={r.name}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      {r.detail && (
                        <p className="mt-0.5 text-xs text-slate-500">{r.detail}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      <WhereLinks where={r.where} />
                    </td>
                    <td className="py-2.5 pr-3 text-slate-700">{r.accounts}</td>
                    <td className="py-2.5 pr-3 text-slate-700">{r.item}</td>
                    <td className="py-2.5 text-slate-700">{r.projection}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Celular: tarjetas */}
            <ul className="space-y-3 md:hidden">
              {g.rows.map((r) => (
                <li key={r.name} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium text-slate-900">{r.name}</p>
                  {r.detail && (
                    <p className="mt-0.5 text-xs text-slate-500">{r.detail}</p>
                  )}
                  <div className="mt-1 text-xs">
                    <WhereLinks where={r.where} />
                  </div>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-xs text-slate-500">Cuentas</dt>
                    <dd className="text-slate-700">{r.accounts}</dd>
                    <dt className="text-xs text-slate-500">Gasto / ingreso</dt>
                    <dd className="text-slate-700">{r.item}</dd>
                    <dt className="text-xs text-slate-500">Proyección</dt>
                    <dd className="text-slate-700">{r.projection}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Rutina del mes">
          <ol className="space-y-3">
            {ROUTINE.map((r, i) => (
              <li key={r.when} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{r.when}</p>
                  <p className="text-slate-600">{r.steps}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Reglas">
          <ul className="space-y-3">
            {RULES.map((r) => (
              <li key={r.title} className="text-sm">
                <p className="font-medium text-slate-900">{r.title}</p>
                <p className="text-slate-600">{r.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Atajos y asistentes">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="text-sm">
            <p className="font-medium text-slate-900">Accesos rápidos</p>
            <p className="mt-0.5 text-slate-600">
              Están en el <A href="/personal">Resumen</A> y, si instalaste la app,
              manteniendo apretado su ícono.
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {SHORTCUTS.map((s) => (
                <li key={s.key}>
                  <Link
                    href={s.href}
                    className="inline-block rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-900">Conexiones IA</p>
            <p className="mt-0.5 text-slate-600">
              Conectá Claude (u otro asistente compatible con MCP) para consultar y
              cargar gastos, ingresos, ahorros, auto y peso conversando. Se
              configura en <A href="/personal/conexiones">Conexiones IA</A>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
