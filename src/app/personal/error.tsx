"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function PersonalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDb = /MongoDB|conectar a la base/i.test(error.message);

  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-700">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {isDb ? "No se pudo conectar a la base de datos" : "Algo salió mal"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {isDb
          ? "Revisá que tu IP esté habilitada en MongoDB Atlas (Network Access) y que el cluster no esté pausado."
          : "Ocurrió un error al cargar esta sección."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        <RotateCw className="h-4 w-4" />
        Reintentar
      </button>
    </div>
  );
}
