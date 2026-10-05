import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { runWithContext } from "@/lib/request-context";
import { getActiveProfile } from "@/lib/profile";
import { EXPENSE_TAGS } from "@/lib/tags";
import { addMonths } from "@/lib/period";
import {
  getCards,
  getFixedExpenses,
  getMonthData,
  getMonthlyComparison,
  getSpendingTrend,
} from "@/features/gastos/queries";
import {
  createExpense,
  createInstallmentPurchase,
  payExpenses,
  setExpensePaid,
  setTagBudget,
} from "@/features/gastos/actions";
import {
  getAccountMovements,
  getContableOverview,
  getExchangeRate,
  getIncomes,
  getProjection,
  getReconciliations,
  getSavingsAccounts,
} from "@/features/contable/queries";
import {
  createIncome,
  receiveIncome,
  reconcileAccounts,
  transferBetweenAccounts,
} from "@/features/contable/actions";
import { getPfOverview } from "@/features/pf-dardo/queries";
import { getAutoOverview } from "@/features/auto/queries";
import { getWeightOverview } from "@/features/salud/queries";
import { createWeightEntry, updateWeightEntry } from "@/features/salud/actions";
import {
  createFuelLog,
  createServiceRecord,
  createUpcomingService,
  updateFuelLog,
  updateServiceRecord,
  updateUpcomingService,
} from "@/features/auto/actions";

/* ------------------------------- Utilidades ------------------------------ */

const TZ = process.env.APP_TIMEZONE ?? "America/Argentina/Buenos_Aires";

/** Fecha y mes de hoy en la zona horaria del usuario (el servidor corre en UTC). */
function today() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  return { date, period: date.slice(0, 7), dateTime: `${date}T${time}` };
}

const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato YYYY-MM");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");
const id = z.string().regex(/^[a-f\d]{24}$/i, "Id de 24 caracteres hex");
const currency = z.enum(["ARS", "USD"]);
const tag = z.enum(EXPENSE_TAGS);

type Ctx = { http?: { authInfo?: { extra?: Record<string, unknown> } } };
type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const text = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 1) }],
});
const fail = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

/**
 * Corre la herramienta con el perfil del token (ver verifyBearer). Sin token
 * validado no hay contexto y no se ejecuta nada.
 */
function scoped<A>(fn: (args: A) => Promise<ToolResult>) {
  // Con inputSchema el SDK llama (args, ctx); sin parámetros, solo (ctx).
  return async (...params: unknown[]): Promise<ToolResult> => {
    const ctx = (params.length > 1 ? params[1] : params[0]) as Ctx | undefined;
    const args = (params.length > 1 ? params[0] : {}) as A;
    const profileKey = ctx?.http?.authInfo?.extra?.profileKey;
    if (typeof profileKey !== "string") return fail("No autenticado.");
    try {
      return await runWithContext({ source: "mcp", profileKey }, () => fn(args));
    } catch (e) {
      return fail((e as Error).message || "Error inesperado.");
    }
  };
}

/** Convierte el resultado de una acción de la app en respuesta de herramienta. */
async function act(
  run: Promise<{ ok: true } | { ok: false; error: string }>,
  okMessage: string,
): Promise<ToolResult> {
  const res = await run;
  return res.ok ? text({ ok: true, mensaje: okMessage }) : fail(res.error);
}

const READ = { readOnlyHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

/* ------------------------------ Herramientas ----------------------------- */

export function registerDashboardTools(server: McpServer) {
  /* ---------------------------- Lectura --------------------------------- */

  server.registerTool(
    "contexto",
    {
      title: "Contexto del dashboard",
      description:
        "Fecha de hoy, mes actual, perfil activo, cotización USD/ARS y etiquetas de gasto disponibles. Llamala primero si necesitás fechas o etiquetas.",
      annotations: READ,
    },
    scoped(async () => {
      const [{ active }, rate] = await Promise.all([getActiveProfile(), getExchangeRate()]);
      const t = today();
      return text({
        hoy: t.date,
        mes_actual: t.period,
        zona_horaria: TZ,
        perfil: active.name,
        cotizacion_usd_ars: rate.ready ? rate.value : null,
        etiquetas: EXPENSE_TAGS,
        categorias_gasto: ["tarjeta", "prestamo", "fijo", "previsto", "no_registrado"],
      });
    }),
  );

  server.registerTool(
    "resumen_mes",
    {
      title: "Resumen de gastos del mes",
      description:
        "Totales del mes por categoría y moneda (incluye lo disponible de los presupuestos por etiqueta), pagado vs. pendiente, y estado de cada presupuesto.",
      inputSchema: z.object({ mes: period.optional().describe("YYYY-MM; por defecto el actual") }),
      annotations: READ,
    },
    scoped(async ({ mes }: { mes?: string }) => {
      const d = await getMonthData(mes ?? today().period);
      return text({
        mes: d.period,
        resumen: d.summary,
        presupuestos: d.budgets.map((b) => ({
          etiqueta: b.tag,
          moneda: b.currency,
          previsto: b.amount,
          gastado: b.spent,
          disponible: b.remaining,
        })),
        cantidad_gastos: d.expenses.length,
        fijos_sin_cargar: d.pendingManualFixed.length + d.pendingAutoFixedCount,
      });
    }),
  );

  server.registerTool(
    "listar_gastos",
    {
      title: "Listar gastos de un mes",
      description:
        "Gastos cargados en un mes, con id (para pagarlos), monto, moneda, categoría, tarjeta, etiqueta, cuota y si están pagados. Filtros opcionales.",
      inputSchema: z.object({
        mes: period.optional(),
        categoria: z.enum(["tarjeta", "prestamo", "fijo", "previsto", "no_registrado"]).optional(),
        tarjeta: z.string().optional().describe("Nombre (o parte) de la tarjeta"),
        etiqueta: tag.optional(),
        estado: z.enum(["pendientes", "pagados", "todos"]).default("todos"),
      }),
      annotations: READ,
    },
    scoped(
      async (a: {
        mes?: string;
        categoria?: string;
        tarjeta?: string;
        etiqueta?: string;
        estado?: "pendientes" | "pagados" | "todos";
      }) => {
        const d = await getMonthData(a.mes ?? today().period);
        const card = a.tarjeta?.toLowerCase();
        const items = d.expenses
          .filter((e) => !a.categoria || e.category === a.categoria)
          .filter((e) => !card || (e.cardName ?? "").toLowerCase().includes(card))
          .filter((e) => !a.etiqueta || e.tag === a.etiqueta)
          .filter((e) =>
            a.estado === "pendientes" ? !e.paid : a.estado === "pagados" ? e.paid : true,
          )
          .map((e) => ({
            id: e.id,
            descripcion: e.description,
            monto: e.amount,
            moneda: e.currency,
            categoria: e.category,
            tarjeta: e.cardName,
            etiqueta: e.tag,
            cuota: e.installment ? `${e.installment.current}/${e.installment.total}` : null,
            pagado: e.paid,
          }));
        return text({ mes: d.period, cantidad: items.length, gastos: items });
      },
    ),
  );

  server.registerTool(
    "comparar_meses",
    {
      title: "Comparar un mes con el anterior",
      description:
        "Totales de un mes contra el anterior, desglosados por categoría, tarjeta y etiqueta (ARS y USD).",
      inputSchema: z.object({ mes: period.optional() }),
      annotations: READ,
    },
    scoped(async ({ mes }: { mes?: string }) =>
      text(await getMonthlyComparison(mes ?? today().period)),
    ),
  );

  server.registerTool(
    "evolucion_gastos",
    {
      title: "Evolución mensual de gastos",
      description:
        "Total de gastos por mes y por etiqueta (ARS y USD por separado), para meses pasados y futuros (cuotas, fijos y presupuestos ya cargados).",
      inputSchema: z.object({
        hasta: period.optional().describe("Último mes del tramo pasado; por defecto el actual"),
        meses_atras: z.number().int().min(1).max(24).default(6),
        meses_adelante: z.number().int().min(0).max(24).default(6),
      }),
      annotations: READ,
    },
    scoped(
      async (a: { hasta?: string; meses_atras?: number; meses_adelante?: number }) =>
        text(
          await getSpendingTrend(
            a.hasta ?? today().period,
            a.meses_atras ?? 6,
            a.meses_adelante ?? 6,
          ),
        ),
    ),
  );

  server.registerTool(
    "estado_contable",
    {
      title: "Estado contable de hoy",
      description:
        "Ahorros totales (y reales, descontando plazos fijos), por disponibilidad y categoría; ingresos por cobrar, gastos por pagar y disponible del mes actual, por moneda.",
      annotations: READ,
    },
    scoped(async () => text(await getContableOverview())),
  );

  server.registerTool(
    "proyeccion",
    {
      title: "Proyección de saldo",
      description:
        "Saldo proyectado mes a mes por moneda: saldo actual + ingresos por cobrar − gastos por pagar + rendimientos.",
      inputSchema: z.object({ meses: z.number().int().min(1).max(36).default(6) }),
      annotations: READ,
    },
    scoped(async ({ meses }: { meses?: number }) => text(await getProjection(meses ?? 6))),
  );

  server.registerTool(
    "cuentas_ahorro",
    {
      title: "Cuentas de ahorro",
      description:
        "Cuentas activas con id, saldo, moneda, disponibilidad y rendimiento. Usá los id para pagar, cobrar o transferir.",
      annotations: READ,
    },
    scoped(async () => {
      const accounts = await getSavingsAccounts(false);
      return text(
        accounts.map((a) => ({
          id: a.id,
          nombre: a.name,
          categoria: a.category,
          moneda: a.currency,
          saldo: a.balance,
          disponibilidad: a.availability,
          rendimiento: a.return,
          recibe_excedente: a.receivesNet,
        })),
      );
    }),
  );

  server.registerTool(
    "movimientos",
    {
      title: "Movimientos de cuentas",
      description:
        "Últimos pagos, cobros, transferencias y ajustes por cuenta, más los últimos cierres de mes.",
      inputSchema: z.object({
        cuenta_id: id.optional(),
        limite: z.number().int().min(1).max(50).default(15),
      }),
      annotations: READ,
    },
    scoped(async (a: { cuenta_id?: string; limite?: number }) => {
      const [byAccount, cierres] = await Promise.all([
        getAccountMovements(a.limite ?? 15),
        getReconciliations(3),
      ]);
      return text({
        movimientos: a.cuenta_id ? (byAccount[a.cuenta_id] ?? []) : byAccount,
        ultimos_cierres: cierres,
      });
    }),
  );

  server.registerTool(
    "ingresos",
    {
      title: "Ingresos",
      description:
        "Ingresos cargados (recurrentes o únicos, confirmados o posibles) con id y los meses ya cobrados.",
      annotations: READ,
    },
    scoped(async () => text(await getIncomes())),
  );

  server.registerTool(
    "tarjetas_y_fijos",
    {
      title: "Tarjetas y gastos fijos",
      description: "Tarjetas (id, cierre, vencimiento) y plantillas de gastos fijos.",
      annotations: READ,
    },
    scoped(async () => {
      const [tarjetas, fijos] = await Promise.all([getCards(), getFixedExpenses()]);
      return text({ tarjetas, fijos });
    }),
  );

  server.registerTool(
    "plazos_fijos",
    {
      title: "Plazos fijos",
      description: "Plazos fijos vigentes e historial de renovaciones, con totales por moneda.",
      annotations: READ,
    },
    scoped(async () => text(await getPfOverview())),
  );

  server.registerTool(
    "auto",
    {
      title: "Auto",
      description:
        "Por patente: resumen (gasto en combustible, consumo promedio, próximo service y su estado vencido/pronto/ok), cargas de combustible, próximos services e historial de services, con sus id para editarlos.",
      inputSchema: z.object({
        patente: z.string().optional().describe("Filtra por patente; vacío = todas"),
      }),
      annotations: READ,
    },
    scoped(async ({ patente }: { patente?: string }) => {
      const o = await getAutoOverview();
      const want = patente?.trim().toUpperCase();
      const match = (plate: string) => !want || plate === want;
      const fuel = o.fuelLogs.filter((f) => match(f.plate));
      const upcoming = o.upcomingServices.filter((u) => match(u.plate));
      const records = o.serviceRecords.filter((r) => match(r.plate));
      const plates = o.plates.filter(match);
      const resumen = plates.map((plate) => {
        const fl = fuel.filter((f) => f.plate === plate);
        const km = fl.reduce((a, f) => a + f.km, 0);
        const liters = fl.reduce((a, f) => a + f.liters, 0);
        const gasto: Record<string, number> = {};
        for (const f of fl) gasto[f.currency] = (gasto[f.currency] ?? 0) + f.amount;
        const next = upcoming
          .filter((u) => u.plate === plate)
          .sort((a, b) => (a.nextServiceDate < b.nextServiceDate ? -1 : 1))[0];
        return {
          patente: plate,
          cargas: fl.length,
          gasto_combustible: gasto,
          litros_cada_100km_promedio: km > 0 ? Math.round((liters / km) * 1000) / 10 : null,
          ultima_carga: fl[0]?.date ?? null,
          proximo_service: next
            ? { fecha: next.nextServiceDate, detalle: next.description, estado: next.status }
            : null,
          services_hechos: records.filter((r) => r.plate === plate).length,
        };
      });
      return text({
        resumen,
        cargas_combustible: fuel,
        proximos_services: upcoming,
        historial_services: records,
      });
    }),
  );

  server.registerTool(
    "peso",
    {
      title: "Peso",
      description:
        "Últimas mediciones de peso (con id, para corregirlas) y promedios semanales (lunes a domingo) con su variación contra la semana anterior.",
      inputSchema: z.object({ semanas: z.number().int().min(1).max(104).default(12) }),
      annotations: READ,
    },
    scoped(async ({ semanas }: { semanas?: number }) => {
      const o = await getWeightOverview();
      return text({
        ultimas_mediciones: o.entries.slice(0, 20),
        semanas: o.weeks.slice(-(semanas ?? 12)),
      });
    }),
  );

  /* ---------------------------- Escritura ------------------------------- */

  server.registerTool(
    "cargar_gasto",
    {
      title: "Cargar un gasto",
      description:
        "Carga un gasto pendiente en un mes. Para tarjeta indicá tarjeta_id (ver tarjetas_y_fijos). Monto negativo = reintegro.",
      inputSchema: z.object({
        mes: period.optional(),
        categoria: z.enum(["tarjeta", "prestamo", "fijo", "previsto", "no_registrado"]),
        descripcion: z.string().min(1),
        monto: z.number(),
        moneda: currency.default("ARS"),
        tarjeta_id: id.optional(),
        etiqueta: tag.optional(),
        nota: z.string().optional(),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        mes?: string;
        categoria: "tarjeta" | "prestamo" | "fijo" | "previsto" | "no_registrado";
        descripcion: string;
        monto: number;
        moneda?: "ARS" | "USD";
        tarjeta_id?: string;
        etiqueta?: (typeof EXPENSE_TAGS)[number];
        nota?: string;
      }) =>
        act(
          createExpense({
            period: a.mes ?? today().period,
            category: a.categoria,
            description: a.descripcion,
            amount: a.monto,
            currency: a.moneda ?? "ARS",
            cardId: a.tarjeta_id ?? "",
            note: a.nota,
            tag: a.etiqueta ?? "",
          }),
          `Gasto “${a.descripcion}” cargado.`,
        ),
    ),
  );

  server.registerTool(
    "cargar_compra_en_cuotas",
    {
      title: "Cargar una compra en cuotas",
      description:
        "Distribuye una compra en cuotas mes a mes desde mes_inicio (una cuota por mes, desde cuota_actual hasta total).",
      inputSchema: z.object({
        descripcion: z.string().min(1),
        monto_cuota: z.number().positive(),
        moneda: currency.default("ARS"),
        categoria: z.enum(["tarjeta", "prestamo"]).default("tarjeta"),
        tarjeta_id: id.optional(),
        mes_inicio: period.optional(),
        cuota_actual: z.number().int().min(1).default(1),
        total_cuotas: z.number().int().min(1).max(120),
        etiqueta: tag.optional(),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        descripcion: string;
        monto_cuota: number;
        moneda?: "ARS" | "USD";
        categoria?: "tarjeta" | "prestamo";
        tarjeta_id?: string;
        mes_inicio?: string;
        cuota_actual?: number;
        total_cuotas: number;
        etiqueta?: (typeof EXPENSE_TAGS)[number];
      }) =>
        act(
          createInstallmentPurchase({
            description: a.descripcion,
            amountPerInstallment: a.monto_cuota,
            currency: a.moneda ?? "ARS",
            category: a.categoria ?? "tarjeta",
            cardId: a.tarjeta_id ?? "",
            startPeriod: a.mes_inicio ?? today().period,
            current: a.cuota_actual ?? 1,
            total: a.total_cuotas,
            tag: a.etiqueta ?? "",
          }),
          `Compra en ${a.total_cuotas} cuotas cargada.`,
        ),
    ),
  );

  server.registerTool(
    "presupuesto_etiqueta",
    {
      title: "Definir un presupuesto por etiqueta",
      description:
        "Crea o reemplaza el presupuesto de una etiqueta para un mes y moneda. Lo disponible cuenta como gasto previsto.",
      inputSchema: z.object({
        mes: period.optional(),
        etiqueta: tag,
        moneda: currency.default("ARS"),
        monto: z.number().positive(),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        mes?: string;
        etiqueta: (typeof EXPENSE_TAGS)[number];
        moneda?: "ARS" | "USD";
        monto: number;
      }) =>
        act(
          setTagBudget({
            period: a.mes ?? today().period,
            tag: a.etiqueta,
            currency: a.moneda ?? "ARS",
            amount: a.monto,
          }),
          `Presupuesto de ${a.etiqueta} guardado.`,
        ),
    ),
  );

  server.registerTool(
    "cargar_ingreso",
    {
      title: "Cargar un ingreso",
      description:
        "Agrega un ingreso estimado: único (en un mes) o recurrente (mensual, semestral o anual desde un mes).",
      inputSchema: z.object({
        descripcion: z.string().min(1),
        origen: z.string().default(""),
        monto: z.number().positive(),
        moneda: currency.default("ARS"),
        tipo: z.enum(["unico", "recurrente"]),
        mes: period.optional().describe("Para único: el mes; para recurrente: desde"),
        hasta: period.optional(),
        frecuencia: z.enum(["monthly", "semiannual", "annual"]).default("monthly"),
        confirmado: z.boolean().default(true),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        descripcion: string;
        origen?: string;
        monto: number;
        moneda?: "ARS" | "USD";
        tipo: "unico" | "recurrente";
        mes?: string;
        hasta?: string;
        frecuencia?: "monthly" | "semiannual" | "annual";
        confirmado?: boolean;
      }) => {
        const m = a.mes ?? today().period;
        return act(
          createIncome({
            description: a.descripcion,
            origin: a.origen ?? "",
            amount: a.monto,
            currency: a.moneda ?? "ARS",
            kind: a.tipo === "unico" ? "oneoff" : "recurring",
            period: a.tipo === "unico" ? m : "",
            startPeriod: a.tipo === "recurrente" ? m : "",
            endPeriod: a.hasta ?? "",
            frequency: a.frecuencia ?? "monthly",
            confirmed: a.confirmado ?? true,
          }),
          `Ingreso “${a.descripcion}” cargado.`,
        );
      },
    ),
  );

  server.registerTool(
    "pagar_gastos",
    {
      title: "Pagar gastos",
      description:
        "Marca gastos como pagados y descuenta cada monto de la cuenta elegida para su moneda (cada gasto se paga en su moneda). Por defecto paga el monto cargado; un pago menor igual deja el gasto pagado. solo_marcar=true no toca ninguna cuenta.",
      inputSchema: z.object({
        gastos: z
          .array(z.object({ id, monto: z.number().positive().optional() }))
          .min(1)
          .describe("Ids de listar_gastos; monto opcional si pagaste distinto"),
        cuenta_ars_id: id.optional(),
        cuenta_usd_id: id.optional(),
        fecha: date.optional(),
        solo_marcar: z.boolean().default(false),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        gastos: { id: string; monto?: number }[];
        cuenta_ars_id?: string;
        cuenta_usd_id?: string;
        fecha?: string;
        solo_marcar?: boolean;
      }) => {
        // Monto por defecto: el cargado en el gasto.
        const needed = a.gastos.filter((g) => g.monto == null);
        let loaded = new Map<string, number>();
        if (needed.length > 0) {
          const months = new Set<string>();
          const t = today().period;
          for (let i = -3; i <= 12; i++) months.add(addMonths(t, i));
          const all = await Promise.all([...months].map((m) => getMonthData(m)));
          loaded = new Map(all.flatMap((d) => d.expenses.map((e) => [e.id, e.amount] as const)));
          const missing = needed.filter((g) => !loaded.has(g.id));
          if (missing.length > 0) {
            return fail(
              `No encontré estos gastos entre 3 meses atrás y 12 adelante: ${missing.map((g) => g.id).join(", ")}. Indicá el monto.`,
            );
          }
        }
        return act(
          payExpenses({
            items: a.gastos.map((g) => ({ id: g.id, amount: g.monto ?? loaded.get(g.id)! })),
            date: a.fecha ?? today().date,
            accounts: { ARS: a.cuenta_ars_id, USD: a.cuenta_usd_id },
            skipAccounts: a.solo_marcar ?? false,
          }),
          `${a.gastos.length} gasto(s) pagado(s).`,
        );
      },
    ),
  );

  server.registerTool(
    "desmarcar_pago",
    {
      title: "Desmarcar un pago",
      description:
        "Vuelve un gasto a pendiente; si se había pagado desde una cuenta, la plata vuelve a esa cuenta.",
      inputSchema: z.object({ gasto_id: id }),
      annotations: WRITE,
    },
    scoped(async ({ gasto_id }: { gasto_id: string }) =>
      act(setExpensePaid(gasto_id, false), "Gasto pendiente otra vez."),
    ),
  );

  server.registerTool(
    "cobrar_ingreso",
    {
      title: "Cobrar un ingreso",
      description:
        "Registra el cobro real de un ingreso en un mes, repartido en una o más cuentas de la misma moneda. Desde ahí la proyección deja de sumar el estimado de ese mes.",
      inputSchema: z.object({
        ingreso_id: id,
        mes: period.optional(),
        fecha: date.optional(),
        repartos: z
          .array(z.object({ cuenta_id: id, monto: z.number().positive() }))
          .min(1),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        ingreso_id: string;
        mes?: string;
        fecha?: string;
        repartos: { cuenta_id: string; monto: number }[];
      }) =>
        act(
          receiveIncome({
            incomeId: a.ingreso_id,
            period: a.mes ?? today().period,
            date: a.fecha ?? today().date,
            splits: a.repartos.map((r) => ({ accountId: r.cuenta_id, amount: r.monto })),
          }),
          "Cobro registrado.",
        ),
    ),
  );

  server.registerTool(
    "transferir",
    {
      title: "Transferir entre cuentas",
      description:
        "Mueve plata entre dos cuentas de ahorro. Si las monedas difieren (compra/venta de dólares), indicá monto_destino.",
      inputSchema: z.object({
        desde_id: id,
        hacia_id: id,
        monto: z.number().positive(),
        monto_destino: z.number().positive().optional(),
        fecha: date.optional(),
        detalle: z.string().default(""),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        desde_id: string;
        hacia_id: string;
        monto: number;
        monto_destino?: number;
        fecha?: string;
        detalle?: string;
      }) =>
        act(
          transferBetweenAccounts({
            fromId: a.desde_id,
            toId: a.hacia_id,
            amount: a.monto,
            toAmount: a.monto_destino,
            date: a.fecha ?? today().date,
            description: a.detalle ?? "",
          }),
          "Transferencia registrada.",
        ),
    ),
  );

  server.registerTool(
    "cierre_de_mes",
    {
      title: "Cierre de mes",
      description:
        "Lleva cuentas a su saldo real del banco. Si falta plata, queda como gasto pagado “No registrado” (o ajuste si falta_como=ajuste); si sobra, como ajuste. Confirmá los saldos con el usuario antes de usarla.",
      inputSchema: z.object({
        mes: period.optional(),
        fecha: date.optional(),
        cuentas: z
          .array(
            z.object({
              cuenta_id: id,
              saldo_real: z.number(),
              falta_como: z.enum(["gasto", "ajuste"]).default("gasto"),
            }),
          )
          .min(1),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        mes?: string;
        fecha?: string;
        cuentas: { cuenta_id: string; saldo_real: number; falta_como?: "gasto" | "ajuste" }[];
      }) =>
        act(
          reconcileAccounts({
            period: a.mes ?? today().period,
            date: a.fecha ?? today().date,
            items: a.cuentas.map((c) => ({
              accountId: c.cuenta_id,
              realBalance: c.saldo_real,
              missingAs: c.falta_como ?? "gasto",
            })),
          }),
          "Cierre de mes guardado.",
        ),
    ),
  );

  /* --------------------------- Auto (escritura) ------------------------ */

  const autoRead = async () => getAutoOverview();
  const notFound = (what: string) => fail(`No encontré ${what} con ese id (ver la herramienta auto).`);
  const plate = z.string().min(1).describe("Patente, ej. AB123CD");

  server.registerTool(
    "cargar_combustible",
    {
      title: "Cargar combustible",
      description:
        "Registra una carga de tanque lleno: km recorridos desde la carga anterior (no el odómetro), litros y gasto.",
      inputSchema: z.object({
        patente: plate,
        fecha: date.optional(),
        km_recorridos: z.number().min(0),
        litros: z.number().positive(),
        monto: z.number().positive(),
        moneda: currency.default("ARS"),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        patente: string;
        fecha?: string;
        km_recorridos: number;
        litros: number;
        monto: number;
        moneda?: "ARS" | "USD";
      }) =>
        act(
          createFuelLog({
            plate: a.patente,
            date: a.fecha ?? today().date,
            km: a.km_recorridos,
            liters: a.litros,
            amount: a.monto,
            currency: a.moneda ?? "ARS",
          }),
          `Carga de ${a.litros} l registrada para ${a.patente.toUpperCase()}.`,
        ),
    ),
  );

  server.registerTool(
    "editar_carga_combustible",
    {
      title: "Editar una carga de combustible",
      description: "Corrige una carga existente; solo cambian los campos que pases.",
      inputSchema: z.object({
        id,
        patente: z.string().min(1).optional(),
        fecha: date.optional(),
        km_recorridos: z.number().min(0).optional(),
        litros: z.number().positive().optional(),
        monto: z.number().positive().optional(),
        moneda: currency.optional(),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        id: string;
        patente?: string;
        fecha?: string;
        km_recorridos?: number;
        litros?: number;
        monto?: number;
        moneda?: "ARS" | "USD";
      }) => {
        const cur = (await autoRead()).fuelLogs.find((f) => f.id === a.id);
        if (!cur) return notFound("una carga de combustible");
        return act(
          updateFuelLog(a.id, {
            plate: a.patente ?? cur.plate,
            date: a.fecha ?? cur.date,
            km: a.km_recorridos ?? cur.km,
            liters: a.litros ?? cur.liters,
            amount: a.monto ?? cur.amount,
            currency: a.moneda ?? cur.currency,
          }),
          "Carga actualizada.",
        );
      },
    ),
  );

  server.registerTool(
    "programar_service",
    {
      title: "Programar el próximo service",
      description: "Agenda un próximo service para una patente (fecha estimada, detalle y mecánico).",
      inputSchema: z.object({
        patente: plate,
        fecha_service: date,
        detalle: z.string().default(""),
        mecanico: z.string().default(""),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: { patente: string; fecha_service: string; detalle?: string; mecanico?: string }) =>
        act(
          createUpcomingService({
            plate: a.patente,
            loadedDate: today().date,
            nextServiceDate: a.fecha_service,
            description: a.detalle ?? "",
            mechanic: a.mecanico ?? "",
          }),
          `Service programado para el ${a.fecha_service}.`,
        ),
    ),
  );

  server.registerTool(
    "editar_proximo_service",
    {
      title: "Editar un próximo service",
      description: "Cambia la fecha, el detalle o el mecánico de un service programado.",
      inputSchema: z.object({
        id,
        patente: z.string().min(1).optional(),
        fecha_service: date.optional(),
        detalle: z.string().optional(),
        mecanico: z.string().optional(),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        id: string;
        patente?: string;
        fecha_service?: string;
        detalle?: string;
        mecanico?: string;
      }) => {
        const cur = (await autoRead()).upcomingServices.find((u) => u.id === a.id);
        if (!cur) return notFound("un próximo service");
        return act(
          updateUpcomingService(a.id, {
            plate: a.patente ?? cur.plate,
            loadedDate: cur.loadedDate,
            nextServiceDate: a.fecha_service ?? cur.nextServiceDate,
            description: a.detalle ?? cur.description,
            mechanic: a.mecanico ?? cur.mechanic,
          }),
          "Próximo service actualizado.",
        );
      },
    ),
  );

  server.registerTool(
    "registrar_service",
    {
      title: "Registrar un service hecho",
      description: "Agrega al historial un service realizado, con su costo y los repuestos cambiados.",
      inputSchema: z.object({
        patente: plate,
        fecha: date.optional(),
        detalle: z.string().min(1),
        monto: z.number().positive(),
        moneda: currency.default("ARS"),
        repuestos: z.array(z.string().min(1)).default([]),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        patente: string;
        fecha?: string;
        detalle: string;
        monto: number;
        moneda?: "ARS" | "USD";
        repuestos?: string[];
      }) =>
        act(
          createServiceRecord({
            plate: a.patente,
            date: a.fecha ?? today().date,
            description: a.detalle,
            amount: a.monto,
            currency: a.moneda ?? "ARS",
            parts: a.repuestos ?? [],
          }),
          "Service registrado en el historial.",
        ),
    ),
  );

  server.registerTool(
    "editar_service",
    {
      title: "Editar un service del historial",
      description: "Corrige un service realizado; solo cambian los campos que pases.",
      inputSchema: z.object({
        id,
        patente: z.string().min(1).optional(),
        fecha: date.optional(),
        detalle: z.string().min(1).optional(),
        monto: z.number().positive().optional(),
        moneda: currency.optional(),
        repuestos: z.array(z.string().min(1)).optional(),
      }),
      annotations: WRITE,
    },
    scoped(
      async (a: {
        id: string;
        patente?: string;
        fecha?: string;
        detalle?: string;
        monto?: number;
        moneda?: "ARS" | "USD";
        repuestos?: string[];
      }) => {
        const cur = (await autoRead()).serviceRecords.find((r) => r.id === a.id);
        if (!cur) return notFound("un service del historial");
        return act(
          updateServiceRecord(a.id, {
            plate: a.patente ?? cur.plate,
            date: a.fecha ?? cur.date,
            description: a.detalle ?? cur.description,
            amount: a.monto ?? cur.amount,
            currency: a.moneda ?? cur.currency,
            parts: a.repuestos ?? cur.parts,
          }),
          "Service actualizado.",
        );
      },
    ),
  );

  /* -------------------------- Salud (escritura) ------------------------- */

  server.registerTool(
    "registrar_peso",
    {
      title: "Registrar peso",
      description: "Registra una medición de peso en kg; por defecto con la fecha y hora actuales.",
      inputSchema: z.object({
        kg: z.number().min(20).max(400),
        fecha_hora: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Formato YYYY-MM-DDTHH:mm")
          .optional(),
      }),
      annotations: WRITE,
    },
    scoped(async (a: { kg: number; fecha_hora?: string }) =>
      act(
        createWeightEntry({ takenAt: a.fecha_hora ?? today().dateTime, weight: a.kg }),
        `Peso de ${a.kg} kg registrado.`,
      ),
    ),
  );

  server.registerTool(
    "editar_peso",
    {
      title: "Corregir una medición de peso",
      description: "Cambia el peso o la fecha y hora de una medición (id de la herramienta peso).",
      inputSchema: z.object({
        id,
        kg: z.number().min(20).max(400).optional(),
        fecha_hora: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Formato YYYY-MM-DDTHH:mm")
          .optional(),
      }),
      annotations: WRITE,
    },
    scoped(async (a: { id: string; kg?: number; fecha_hora?: string }) => {
      const cur = (await getWeightOverview()).entries.find((e) => e.id === a.id);
      if (!cur) return fail("No encontré esa medición (ver la herramienta peso).");
      return act(
        updateWeightEntry(a.id, {
          takenAt: a.fecha_hora ?? cur.takenAt,
          weight: a.kg ?? cur.weight,
        }),
        "Medición actualizada.",
      );
    }),
  );
}
