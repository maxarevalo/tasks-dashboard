import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { PlazoFijo } from "@/models/pf-dardo";
import { addDays, computePlazoFijoResult, tnaToMonthlyPct } from "@/lib/pf";
import { CURRENCIES, type Currency } from "@/lib/money";
import type {
  PfOverview,
  PfTotals,
  PfCurrencyTotals,
  PlazoFijoDTO,
  PfMovementDTO,
} from "./types";

type Lean = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

function mapMovement(doc: Lean): PfMovementDTO {
  return {
    id: str(doc._id),
    date: str(doc.date),
    description: str(doc.description),
    amount: (doc.amount as number) ?? 0,
  };
}

function mapPlazo(doc: Lean): PlazoFijoDTO {
  const startDate = str(doc.startDate);
  const termDays = (doc.termDays as number) ?? 0;
  const principal = (doc.principal as number) ?? 0;
  const tna = (doc.tna as number) ?? 0;
  const endDate = addDays(startDate, termDays);
  const movements = Array.isArray(doc.movements)
    ? (doc.movements as Lean[]).map(mapMovement)
    : [];
  const movementsNet = movements.reduce((s, m) => s + m.amount, 0);
  const result = computePlazoFijoResult(
    principal,
    tna,
    startDate,
    endDate,
    movements,
  );

  return {
    id: str(doc._id),
    description: str(doc.description),
    currency: doc.currency as Currency,
    startDate,
    endDate,
    termDays,
    principal,
    tna,
    monthlyPct: tnaToMonthlyPct(tna),
    movements,
    movementsNet,
    maturityAmount: result.finalAmount,
    earnedAmount: result.totalInterest,
    renewed: Boolean(doc.renewed),
    renewedFromId: doc.renewedFromId ? str(doc.renewedFromId) : null,
  };
}

function zeroTotals(): PfCurrencyTotals {
  return { principal: 0, movementsNet: 0, earned: 0, maturity: 0 };
}

export async function getPfOverview(): Promise<PfOverview> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();

  const docs = await PlazoFijo.find({ userId: uid })
    .sort({ startDate: 1 })
    .lean();
  const plazos = docs.map((d) => mapPlazo(d as Lean));

  const active = plazos.filter((p) => !p.renewed);
  const history = plazos.filter((p) => p.renewed);

  const totals = Object.fromEntries(
    CURRENCIES.map((c) => [c, zeroTotals()]),
  ) as PfTotals;

  for (const p of active) {
    const t = totals[p.currency];
    t.principal += p.principal;
    t.movementsNet += p.movementsNet;
    t.earned += p.earnedAmount;
    t.maturity += p.maturityAmount;
  }

  return { active, history, totals };
}
