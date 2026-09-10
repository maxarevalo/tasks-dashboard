"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Pencil, ArrowRightLeft } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import {
  DOLLAR_TYPES,
  RATE_BASIS,
  DOLLAR_TYPE_LABELS,
  RATE_BASIS_LABELS,
  type DollarType,
  type RateBasis,
} from "@/lib/exchange";
import { useAction } from "@/features/contable/use-action";
import {
  setExchangeRate,
  refreshExchangeRate,
} from "@/features/contable/actions";
import type { ExchangeRateDTO } from "@/features/contable/types";

const STALE_MS = 6 * 60 * 60 * 1000;

function ago(iso: string | null): string {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "hace menos de 1 h";
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export function ExchangeRateCard({ rate }: { rate: ExchangeRateDTO }) {
  const [open, setOpen] = useState(false);
  const { pending, exec, error } = useAction();
  const autoTried = useRef(false);

  // Auto-actualiza si está en modo API y la cotización está vieja.
  useEffect(() => {
    if (autoTried.current) return;
    if (rate.mode !== "api") return;
    const stale =
      !rate.fetchedAt || Date.now() - new Date(rate.fetchedAt).getTime() > STALE_MS;
    if (!stale) return;
    autoTried.current = true;
    exec(() => refreshExchangeRate());
  }, [rate.mode, rate.fetchedAt, exec]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ArrowRightLeft className="h-4 w-4 text-slate-400" />
            Cotización USD/ARS
          </p>
          {rate.ready ? (
            <p className="mt-1 text-sm text-slate-600">
              Compra{" "}
              <span className="font-medium text-slate-900">
                {formatMoney(rate.buy, "ARS")}
              </span>{" "}
              · Venta{" "}
              <span className="font-medium text-slate-900">
                {formatMoney(rate.sell, "ARS")}
              </span>{" "}
              · se usa{" "}
              <span className="font-semibold text-slate-900">
                {formatMoney(rate.value, "ARS")}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-amber-600">
              Sin cotización definida — configurala para ver la vista unificada.
            </p>
          )}
          <p className="mt-0.5 text-xs text-slate-400">
            {rate.mode === "api"
              ? `Dólar ${DOLLAR_TYPE_LABELS[rate.apiType]} (API) · actualizada ${ago(
                  rate.fetchedAt,
                )}`
              : "Cargada a mano"}{" "}
            · base {RATE_BASIS_LABELS[rate.basis].toLowerCase()}
          </p>
        </div>

        <div className="flex gap-2">
          {rate.mode === "api" && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => exec(() => refreshExchangeRate())}
            >
              <RefreshCw
                className={`h-4 w-4 ${pending ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <RateForm rate={rate} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function RateForm({
  rate,
  open,
  onClose,
}: {
  rate: ExchangeRateDTO;
  open: boolean;
  onClose: () => void;
}) {
  const { pending, error, exec, setError } = useAction();
  const [mode, setMode] = useState<"manual" | "api">("manual");
  const [manualBuy, setManualBuy] = useState("");
  const [manualSell, setManualSell] = useState("");
  const [apiType, setApiType] = useState<DollarType>("blue");
  const [basis, setBasis] = useState<RateBasis>("promedio");

  const [synced, setSynced] = useState(false);
  if (open && !synced) {
    setSynced(true);
    setError(null);
    setMode(rate.mode);
    setManualBuy(rate.manualBuy ? String(rate.manualBuy) : "");
    setManualSell(rate.manualSell ? String(rate.manualSell) : "");
    setApiType(rate.apiType);
    setBasis(rate.basis);
  } else if (!open && synced) {
    setSynced(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () =>
        setExchangeRate({
          mode,
          manualBuy: Number(manualBuy) || 0,
          manualSell: Number(manualSell) || 0,
          apiType,
          basis,
        }),
      onClose,
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Cotización USD/ARS">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          {(["manual", "api"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {m === "manual" ? "A mano" : "Desde API"}
            </button>
          ))}
        </div>

        {mode === "manual" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Compra (ARS por USD)">
              <Input
                type="number"
                step="0.01"
                value={manualBuy}
                onChange={(e) => setManualBuy(e.target.value)}
              />
            </Field>
            <Field label="Venta (ARS por USD)">
              <Input
                type="number"
                step="0.01"
                value={manualSell}
                onChange={(e) => setManualSell(e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <Field
            label="Tipo de dólar"
            hint="Se trae de dolarapi.com al guardar y con el botón Actualizar."
          >
            <Select
              value={apiType}
              onChange={(e) => setApiType(e.target.value as DollarType)}
            >
              {DOLLAR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOLLAR_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field
          label="Valor a usar para convertir"
          hint="Se aplica igual en ambos sentidos (ARS↔USD)."
        >
          <Select
            value={basis}
            onChange={(e) => setBasis(e.target.value as RateBasis)}
          >
            {RATE_BASIS.map((b) => (
              <option key={b} value={b}>
                {RATE_BASIS_LABELS[b]}
              </option>
            ))}
          </Select>
        </Field>

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
