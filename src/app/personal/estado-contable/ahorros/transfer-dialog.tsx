"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { todayStr } from "@/lib/pf";
import { useAction } from "@/features/contable/use-action";
import { transferBetweenAccounts } from "@/features/contable/actions";
import type { SavingsAccountDTO } from "@/features/contable/types";

/**
 * Pasa plata de una cuenta a otra. Si las monedas difieren (ej. compra de
 * dólares), se carga también cuánto entró y se muestra la cotización que resulta.
 */
export function TransferDialog({
  open,
  accounts,
  onClose,
}: {
  open: boolean;
  /** Solo cuentas activas. */
  accounts: SavingsAccountDTO[];
  onClose: () => void;
}) {
  const { pending, error, exec, setError } = useAction();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState("");

  const [synced, setSynced] = useState(false);
  if (open && !synced) {
    setSynced(true);
    setError(null);
    setFromId(accounts[0]?.id ?? "");
    setToId(accounts[1]?.id ?? "");
    setAmount("");
    setToAmount("");
    setDate(todayStr());
    setDescription("");
  } else if (!open && synced) {
    setSynced(false);
  }

  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);
  const crossCurrency = !!from && !!to && from.currency !== to.currency;
  // Cotización implícita en ARS por USD, para que se vea si el monto tiene sentido.
  const rate =
    crossCurrency && Number(amount) > 0 && Number(toAmount) > 0
      ? from!.currency === "ARS"
        ? Number(amount) / Number(toAmount)
        : Number(toAmount) / Number(amount)
      : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () =>
        transferBetweenAccounts({
          fromId,
          toId,
          date,
          amount: Number(amount),
          toAmount: crossCurrency ? Number(toAmount) : undefined,
          description,
        }),
      onClose,
    );
  }

  const option = (a: SavingsAccountDTO) => (
    <option key={a.id} value={a.id}>
      {a.name} · {formatMoney(a.balance, a.currency)}
    </option>
  );

  return (
    <Modal open={open} onClose={onClose} title="Transferir entre cuentas">
      <form onSubmit={submit} className="space-y-4">
        {accounts.length < 2 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Necesitás al menos dos cuentas activas para transferir.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Desde">
                <Select
                  value={fromId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setFromId(next);
                    // El destino nunca puede ser la misma cuenta.
                    if (next === toId) {
                      setToId(accounts.find((a) => a.id !== next)?.id ?? "");
                    }
                  }}
                  required
                >
                  {accounts.map(option)}
                </Select>
              </Field>
              <Field label="Hacia">
                <Select value={toId} onChange={(e) => setToId(e.target.value)} required>
                  {accounts.filter((a) => a.id !== fromId).map(option)}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Sale${from ? ` (${from.currency})` : ""}`}>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              {crossCurrency ? (
                <Field
                  label={`Entra (${to!.currency})`}
                  hint={
                    rate
                      ? `Cotización: ${formatMoney(rate, "ARS")} por USD`
                      : undefined
                  }
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={toAmount}
                    onChange={(e) => setToAmount(e.target.value)}
                    required
                  />
                </Field>
              ) : (
                <Field label="Fecha">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </Field>
              )}
            </div>

            {crossCurrency && (
              <Field label="Fecha">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
            )}

            <Field label="Detalle" hint="Opcional, ej. “Suscripción FCI” o “Compra de dólares”">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </>
        )}

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || accounts.length < 2}>
            {pending ? "Transfiriendo…" : "Transferir"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
