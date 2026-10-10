import type { DateStr } from "@/lib/pf";
import type { Currency } from "@/lib/money";

export type MaturityItem = {
  /** Estable por vencimiento: "cuenta:<id>:<fecha>" o "pf:<id>". */
  key: string;
  kind: "cuenta" | "plazo_fijo";
  name: string;
  date: DateStr;
  /** Negativo si ya venció. */
  daysLeft: number;
  currency: Currency;
  /** Saldo de la cuenta o monto al vencimiento del plazo fijo. */
  amount: number;
  href: string;
};
