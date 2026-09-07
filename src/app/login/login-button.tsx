"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/hub";
  const error = searchParams.get("error");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setLoading(true);
        signIn("password", { password, callbackUrl });
      }}
    >
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
          Contraseña incorrecta.
        </p>
      )}

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        autoFocus
        required
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />

      <button
        type="submit"
        disabled={loading || password.length === 0}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
