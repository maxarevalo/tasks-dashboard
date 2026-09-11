import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { PlazoFijo, PfMovement } from "@/models/pf-dardo";
import { addDays, plazoFijoMaturityAmount, tnaToMonthlyPct } from "@/lib/pf";
import { CURRENCIES, type Currency } from "@/lib/money";
import type { PfOverview, PfTotals, PfCurrencyTotals, PlazoFijoDTO, PfMovementDTO } from "./types";

type Lean = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

function mapPlazo(doc: Lean): PlazoFijoDTO {
  const startDate = str(doc.startDate);
  const termDays = (doc.termDays as number) ?? 0;
  const principal = (doc.principal as number) ?? 0;
  const tna = (doc.tna as number) ?? 0;
  const maturityAmount = plazoFijoMaturityAmount(principal, tna, termDays);
  return {
    id: str(doc._id),
    description: str(doc.description),
    currency: doc.currency as Currency,
    startDate,
    endDate: addDays(startDate, termDays),
    termDays,
    principal,
    tna,
    monthlyPct: tnaToMonthlyPct(tna),
    maturityAmount,
    earnedAmount: maturityAmount - principal,
  };
}

function mapMovement(doc: Lean): PfMovementDTO {
  return {
    id: str(doc._id),
    date: str(doc.date),
    description: str(doc.description),
    currency: doc.currency as Currency,
    amount: (doc.amount as number) ?? 0,
  };
}

function zeroTotals(): PfCurrencyTotals {
  return { principal: 0, maturity: 0, earned: 0, movementsNet: 0, simulatedMaturity: 0 };
}

export async function getPfOverview(): Promise<PfOverview> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();

  const [plazoDocs, movementDocs] = await Promise.all([
    PlazoFijo.find({ userId: uid }).sort({ startDate: 1 }).lean(),
    PfMovement.find({ userId: uid }).sort({ date: 1 }).lean(),
  ]);

  const plazos = plazoDocs.map((d) => mapPlazo(d as Lean));
  const movements = movementDocs.map((d) => mapMovement(d as Lean));

  const totals = Object.fromEntries(
    CURRENCIES.map((c) => [c, zeroTotals()]),
  ) as PfTotals;

  for (const p of plazos) {
    const t = totals[p.currency];
    t.principal += p.principal;
    t.maturity += p.maturityAmount;
    t.earned += p.earnedAmount;
  }
  for (const m of movements) {
    totals[m.currency].movementsNet += m.amount;
  }
  for (const c of CURRENCIES) {
    totals[c].simulatedMaturity = totals[c].maturity + totals[c].movementsNet;
  }

  return { plazos, movements, totals };
}
