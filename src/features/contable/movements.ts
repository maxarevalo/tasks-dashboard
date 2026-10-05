import "server-only";
import { AccountMovement, SavingsAccount, type MovementKind } from "@/models/contable";
import type { Currency } from "@/lib/money";

/**
 * Crea un movimiento y lo aplica al saldo de la cuenta. Valida que la cuenta
 * sea del perfil, esté activa y tenga la moneda esperada.
 */
export async function applyMovement(
  uid: string,
  m: {
    accountId: string;
    currency: Currency;
    date: string;
    amount: number;
    kind: MovementKind;
    description: string;
    expenseId?: string | null;
    receiptId?: string | null;
  },
): Promise<void> {
  const account = await SavingsAccount.findOne({
    _id: m.accountId,
    userId: uid,
    archived: { $ne: true },
  })
    .select("currency name")
    .lean();
  if (!account) throw new Error("La cuenta elegida no existe o está archivada.");
  if (account.currency !== m.currency) {
    throw new Error(
      `La cuenta “${account.name}” es en ${account.currency}: elegí una cuenta en ${m.currency}.`,
    );
  }
  await AccountMovement.create({
    userId: uid,
    accountId: m.accountId,
    date: m.date,
    amount: m.amount,
    kind: m.kind,
    description: m.description,
    expenseId: m.expenseId ?? null,
    receiptId: m.receiptId ?? null,
  });
  await SavingsAccount.updateOne(
    { _id: m.accountId, userId: uid },
    { $inc: { balance: m.amount } },
  );
}

/** Borra los movimientos que coinciden y devuelve su efecto al saldo de cada cuenta. */
export async function revertMovements(
  uid: string,
  filter: { expenseId?: string; receiptId?: string },
): Promise<void> {
  const docs = await AccountMovement.find({ userId: uid, ...filter })
    .select("_id accountId amount")
    .lean();
  for (const d of docs) {
    const deleted = await AccountMovement.findOneAndDelete({ _id: d._id, userId: uid });
    if (!deleted) continue; // ya revertido por otra request
    await SavingsAccount.updateOne(
      { _id: d.accountId, userId: uid },
      { $inc: { balance: -((d.amount as number) ?? 0) } },
    );
  }
}
