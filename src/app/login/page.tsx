import { Suspense } from "react";
import { LoginButton } from "./login-button";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 text-lg font-bold text-white">
            D
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Mi Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ingresá con tu cuenta de Google para continuar.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginButton />
        </Suspense>
      </div>
    </main>
  );
}
