"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, BellRing, Landmark, Wallet, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { daysLeftLabel, shortDate } from "@/lib/maturity";
import {
  sendTestPush,
  setNotificationDays,
  subscribePush,
  unsubscribePush,
} from "@/features/notifications/actions";
import type { MaturityItem } from "@/features/vencimientos/types";

type PushState =
  | "loading"
  | "unsupported"
  | "ios-install"
  | "not-configured"
  | "denied"
  | "off"
  | "on";

const DAY_OPTIONS = [0, 1, 2, 3, 5, 7, 15];

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** "Android · Chrome", para reconocer el dispositivo. */
function deviceName(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Mac/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : "Otro";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Navegador";
  return `${os} · ${browser}`;
}

/**
 * Campanita de la barra superior: muestra los próximos vencimientos y deja
 * activar las notificaciones push en este dispositivo.
 */
export function NotificationsBell({
  items,
  daysBefore,
  vapidKey,
}: {
  items: MaturityItem[];
  daysBefore: number;
  vapidKey: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PushState>("loading");
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Registra el service worker y averigua si este dispositivo ya está suscripto.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ua = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/.test(ua);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true;
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      let next: PushState;
      let current: PushSubscription | null = null;
      if (!supported) next = isIOS && !standalone ? "ios-install" : "unsupported";
      else if (!vapidKey) next = "not-configured";
      else {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });
          current = await reg.pushManager.getSubscription();
        } catch {
          current = null;
        }
        next =
          Notification.permission === "denied"
            ? "denied"
            : current
              ? "on"
              : "off";
      }
      if (!cancelled) {
        setSub(current);
        setState(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  // Cerrar al tocar afuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  async function enable() {
    if (!vapidKey) return;
    setBusy(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const s =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));
      const json = s.toJSON();
      const res = await subscribePush({
        endpoint: s.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        device: deviceName(),
      });
      if (!res.ok) {
        await s.unsubscribe();
        setMsg({ ok: false, text: res.error });
        return;
      }
      setSub(s);
      setState("on");
      setMsg({ ok: true, text: "Listo: te vamos a avisar en este dispositivo." });
    } catch (e) {
      // El navegador puede negarse a registrar el dispositivo (ej. modo incógnito).
      setMsg({
        ok: false,
        text: `No se pudo activar en este navegador (${(e as Error).message}). Probá desde la app instalada o fuera del modo incógnito.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!sub) return;
    setBusy(true);
    setMsg(null);
    try {
      await unsubscribePush(sub.endpoint);
      await sub.unsubscribe();
      setSub(null);
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!sub) return;
    setBusy(true);
    setMsg(null);
    const res = await sendTestPush(sub.endpoint);
    setMsg(
      res.ok
        ? { ok: true, text: "Enviada. Debería aparecerte en unos segundos." }
        : { ok: false, text: res.error },
    );
    setBusy(false);
  }

  async function changeDays(n: number) {
    setBusy(true);
    await setNotificationDays(n);
    setBusy(false);
  }

  const urgent = items.filter((i) => i.daysLeft <= daysBefore).length;
  const Icon = urgent > 0 ? BellRing : Bell;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
          urgent > 0
            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
        aria-label={
          items.length > 0
            ? `Vencimientos: ${items.length} próximos`
            : "Vencimientos y notificaciones"
        }
        aria-expanded={open}
        title="Vencimientos y notificaciones"
      >
        <Icon className="h-4 w-4" />
        {items.length > 0 && (
          <span
            className={`absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold text-white ${
              urgent > 0 ? "bg-red-600" : "bg-slate-500"
            }`}
          >
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[75vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Próximos vencimientos</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">
              No hay vencimientos en los próximos días. Cargá la fecha de
              vencimiento en tus cuentas remuneradas (Ahorros) o tus plazos fijos.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((i) => (
                <MaturityRow
                  key={i.key}
                  item={i}
                  highlight={i.daysLeft <= daysBefore}
                  onClick={() => setOpen(false)}
                />
              ))}
            </ul>
          )}

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <PushSection
              state={state}
              busy={busy}
              daysBefore={daysBefore}
              onEnable={enable}
              onDisable={disable}
              onTest={test}
              onDays={changeDays}
            />
            {msg && (
              <p
                className={`mt-2 text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`}
              >
                {msg.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MaturityRow({
  item: i,
  highlight,
  onClick,
}: {
  item: MaturityItem;
  highlight: boolean;
  onClick?: () => void;
}) {
  const KindIcon = i.kind === "plazo_fijo" ? Landmark : Wallet;
  return (
    <li>
      <Link
        href={i.href}
        onClick={onClick}
        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50"
      >
        <span
          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
            i.daysLeft < 0
              ? "bg-red-50 text-red-600"
              : highlight
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          <KindIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-slate-900">
            <span className="font-semibold">{daysLeftLabel(i.daysLeft)}</span>
            {i.daysLeft >= 0 ? " para que venza " : ": "}
            <span className="font-medium">{i.name}</span>
          </span>
          <span className="block text-xs text-slate-500">
            {i.kind === "plazo_fijo" ? "Plazo fijo" : "Cuenta"} · {shortDate(i.date)} ·{" "}
            {formatMoney(i.amount, i.currency)} {i.currency}
          </span>
        </span>
      </Link>
    </li>
  );
}

function PushSection({
  state,
  busy,
  daysBefore,
  onEnable,
  onDisable,
  onTest,
  onDays,
}: {
  state: PushState;
  busy: boolean;
  daysBefore: number;
  onEnable: () => void;
  onDisable: () => void;
  onTest: () => void;
  onDays: (n: number) => void;
}) {
  const btn =
    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50";

  if (state === "loading") return <p className="text-xs text-slate-400">Notificaciones…</p>;
  if (state === "ios-install")
    return (
      <p className="text-xs text-slate-600">
        <span className="font-medium text-slate-900">Notificaciones en iPhone:</span>{" "}
        primero instalá la app (Compartir → <em>Agregar a inicio</em>), abrila desde
        el ícono y activalas desde acá.
      </p>
    );
  if (state === "unsupported")
    return (
      <p className="text-xs text-slate-500">
        Este navegador no permite notificaciones push.
      </p>
    );
  if (state === "not-configured")
    return (
      <p className="text-xs text-slate-500">
        Las notificaciones push todavía no están configuradas en el servidor
        (faltan las claves VAPID).
      </p>
    );
  if (state === "denied")
    return (
      <p className="flex items-start gap-2 text-xs text-slate-600">
        <BellOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Bloqueaste las notificaciones para este sitio. Habilitalas desde los
        ajustes del navegador o de la app y volvé a intentar.
      </p>
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-700">
          {state === "on" ? (
            <span className="font-medium text-emerald-700">
              Notificaciones activadas en este dispositivo
            </span>
          ) : (
            "Recibí un aviso en este dispositivo antes de cada vencimiento."
          )}
        </p>
        {state === "off" && (
          <button
            type="button"
            onClick={onEnable}
            disabled={busy}
            className={`${btn} shrink-0 bg-slate-900 text-white hover:bg-slate-800`}
          >
            Activar
          </button>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        Avisarme
        <select
          value={daysBefore}
          onChange={(e) => onDays(Number(e.target.value))}
          disabled={busy}
          className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs"
        >
          {DAY_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "el mismo día" : `${n} ${n === 1 ? "día" : "días"} antes`}
            </option>
          ))}
        </select>
        {daysBefore > 0 && <span className="text-slate-400">y cada día hasta que venza</span>}
      </label>
      {state === "on" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onTest}
            disabled={busy}
            className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
          >
            Enviar prueba
          </button>
          <button
            type="button"
            onClick={onDisable}
            disabled={busy}
            className={`${btn} text-slate-500 hover:bg-slate-100 hover:text-slate-700`}
          >
            Desactivar
          </button>
        </div>
      )}
    </div>
  );
}
