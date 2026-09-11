import { periodMatchesCadence, periodRange, type Period } from "@/lib/period";
import { monthlyReturnRate } from "@/lib/rates";
import type {
  SavingsAccountDTO,
  IncomeDTO,
  CurrencyProjection,
  ProjectionMonth,
  Currency,
} from "./types";

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
    } else {
      const start = inc.startPeriod ?? "0000-00";
      if (
        (!inc.endPeriod || period <= inc.endPeriod) &&
        periodMatchesCadence(start, period, inc.frequency)
      ) {
        total += inc.amount;
      }
    }
  }
  return total;
}

function manualBalanceFor(
  acc: SavingsAccountDTO,
  period: Period,
): number | null {
  let val: number | null = null;
  for (const e of [...acc.manualProjections].sort((a, b) =>
    a.period.localeCompare(b.period),
  )) {
    if (e.period <= period) val = e.amount;
  }
  return val;
}

export function buildProjection(opts: {
  currency: Currency;
  accounts: SavingsAccountDTO[]; // ya filtradas por moneda y activas
  incomes: IncomeDTO[];
  startPeriod: Period;
  months: number;
  expenseByPeriod: Record<Period, number>;
}): CurrencyProjection {
  const { currency, accounts, incomes, startPeriod, months, expenseByPeriod } =
    opts;

  type AccState = {
    acc: SavingsAccountDTO;
    balance: number;
    original: number;
  };
  const state: AccState[] = accounts.map((acc) => ({
    acc,
    balance: acc.balance,
    original: acc.balance,
  }));

  const startingBalance = state.reduce((s, a) => s + a.balance, 0);
  const netReceiver =
    state.find(
      (a) => a.acc.receivesNet && a.acc.return.mode !== "manual",
    ) ?? null;
  let unassigned = 0;

  const rows: ProjectionMonth[] = [];

  for (const period of periodRange(startPeriod, months)) {
    const income = incomeForMonth(incomes, period, currency);
    const expense = expenseByPeriod[period] ?? 0;
    const net = income - expense;

    let interest = 0;
    for (const a of state) {
      const cfg = a.acc.return;
      if (cfg.mode === "manual") {
        const target = manualBalanceFor(a.acc, period);
        if (target != null) {
          interest += target - a.balance;
          a.balance = target;
        }
        continue;
      }
      const rate = monthlyReturnRate(cfg);
      const base = cfg.mode === "monthly" ? a.original : a.balance;
      const gain = base * rate;
      interest += gain;
      a.balance += gain;
    }

    if (netReceiver) netReceiver.balance += net;
    else unassigned += net;

    const balance =
      state.reduce((s, a) => s + a.balance, 0) + unassigned;
    rows.push({ period, income, expense, net, interest, balance });
  }

  return { currency, startingBalance, months: rows };
}
