import "server-only";
import { connectToDatabase } from "@/lib/db";
import { SavingsAccount, Income } from "@/models/contable";
import { getActiveProfileKey } from "@/lib/profile";
import {
  currentPeriod,
  periodRange,
  type Period,
} from "@/lib/period";
import { CURRENCIES, type Currency } from "@/lib/money";
import { getProjectedExpenseTotals } from "@/features/gastos/queries";
import { buildProjection } from "./projection";
import type {
  SavingsAccountDTO,
  IncomeDTO,
  ContableOverview,
  CurrencyProjection,
} from "./types";
import { AVAILABILITY } from "@/models/contable";

type Lean = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

function mapAccount(doc: Lean): SavingsAccountDTO {
  const ret = (doc.return as Record<string, unknown>) ?? {};
  return {
    id: str(doc._id),
    name: str(doc.name),
    category: str(doc.category),
    availability: (doc.availability as SavingsAccountDTO["availability"]) ?? "inmediata",
    currency: doc.currency as Currency,
    balance: (doc.balance as number) ?? 0,
    balanceAsOf: str(doc.balanceAsOf),
    receivesNet: Boolean(doc.receivesNet),
    return: {
      mode: (ret.mode as SavingsAccountDTO["return"]["mode"]) ?? "none",
      annualRatePct: (ret.annualRatePct as number) ?? 0,
      monthlyRatePct: (ret.monthlyRatePct as number) ?? 0,
    },
    manualProjections: Array.isArray(doc.manualProjections)
      ? (doc.manualProjections as { period: string; amount: number }[]).map(
          (m) => ({ period: m.period, amount: m.amount }),
        )
      : [],
    archived: Boolean(doc.archived),
  };
}

function mapIncome(doc: Lean): IncomeDTO {
  return {
    id: str(doc._id),
    description: str(doc.description),
    origin: str(doc.origin),
    amount: (doc.amount as number) ?? 0,
    currency: doc.currency as Currency,
    kind: (doc.kind as IncomeDTO["kind"]) ?? "recurring",
    period: (doc.period as string) ?? null,
    startPeriod: (doc.startPeriod as string) ?? null,
    endPeriod: (doc.endPeriod as string) ?? null,
    confirmed: doc.confirmed !== false,
    active: doc.active !== false,
  };
}

export async function getSavingsAccounts(
  includeArchived = false,
): Promise<SavingsAccountDTO[]> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();
  const filter: Record<string, unknown> = { userId: uid };
  if (!includeArchived) filter.archived = { $ne: true };
  const docs = await SavingsAccount.find(filter)
    .sort({ category: 1, name: 1 })
    .lean();
  return docs.map((d) => mapAccount(d as Lean));
}

export async function getIncomes(): Promise<IncomeDTO[]> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();
  const docs = await Income.find({ userId: uid })
    .sort({ active: -1, origin: 1, description: 1 })
    .lean();
  return docs.map((d) => mapIncome(d as Lean));
}

function incomeForMonth(
  incomes: IncomeDTO[],
  period: Period,
  currency: Currency,
): number {
  let total = 0;
  for (const inc of incomes) {
    if (inc.currency !== currency || !inc.active) continue;
    if (inc.kind === "oneoff") {
      if (inc.period === period) total += inc.amount;
    } else if (
      inc.startPeriod &&
      period >= inc.startPeriod &&
      (!inc.endPeriod || period <= inc.endPeriod)
    ) {
      total += inc.amount;
    }
  }
  return total;
}

const zeroByCurrency = (): Record<Currency, number> => ({ ARS: 0, USD: 0 });

export async function getContableOverview(): Promise<ContableOverview> {
  const period = currentPeriod();
  const [accounts, incomes, expenseTotals] = await Promise.all([
    getSavingsAccounts(false),
    getIncomes(),
    getProjectedExpenseTotals([period]),
  ]);

  const savingsTotal = zeroByCurrency();
  const savingsByAvailability = Object.fromEntries(
    AVAILABILITY.map((a) => [a, zeroByCurrency()]),
  ) as ContableOverview["savingsByAvailability"];
  const byCategoryMap = new Map<string, { ARS: number; USD: number }>();

  for (const acc of accounts) {
    savingsTotal[acc.currency] += acc.balance;
    savingsByAvailability[acc.availability][acc.currency] += acc.balance;
    const key = acc.category || "Sin categoría";
    const entry = byCategoryMap.get(key) ?? { ARS: 0, USD: 0 };
    entry[acc.currency] += acc.balance;
    byCategoryMap.set(key, entry);
  }

  const incomeThisMonth = zeroByCurrency();
  const expenseThisMonth = zeroByCurrency();
  const availableThisMonth = zeroByCurrency();
  for (const c of CURRENCIES) {
    incomeThisMonth[c] = incomeForMonth(incomes, period, c);
    expenseThisMonth[c] = expenseTotals[period]?.[c] ?? 0;
    availableThisMonth[c] =
      savingsTotal[c] + incomeThisMonth[c] - expenseThisMonth[c];
  }

  return {
    period,
    savingsTotal,
    savingsByAvailability,
    savingsByCategory: [...byCategoryMap.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.ARS + b.USD - (a.ARS + a.USD)),
    incomeThisMonth,
    expenseThisMonth,
    availableThisMonth,
  };
}

export async function getProjection(
  months: number,
): Promise<{ period: Period; projections: CurrencyProjection[] }> {
  const period = currentPeriod();
  const horizon = Math.min(Math.max(months, 1), 36);
  const periods = periodRange(period, horizon);

  const [accounts, incomes, expenseTotals] = await Promise.all([
    getSavingsAccounts(false),
    getIncomes(),
    getProjectedExpenseTotals(periods),
  ]);

  const projections = CURRENCIES.map((currency) =>
    buildProjection({
      currency,
      accounts: accounts.filter((a) => a.currency === currency),
      incomes,
      startPeriod: period,
      months: horizon,
      expenseByPeriod: Object.fromEntries(
        periods.map((p) => [p, expenseTotals[p]?.[currency] ?? 0]),
      ),
    }),
  );

  return { period, projections };
}
