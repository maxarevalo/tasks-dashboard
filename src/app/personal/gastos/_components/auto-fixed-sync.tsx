"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateFixedForPeriod } from "@/features/gastos/actions";
import type { Period } from "@/lib/period";

/**
 * Materializa en silencio los gastos fijos marcados como "automáticos" que
 * todavía no están cargados en este mes, y refresca la vista.
 */
export function AutoFixedSync({
  period,
  count,
}: {
  period: Period;
  count: number;
}) {
  const router = useRouter();
  const ran = useRef("");

  useEffect(() => {
    const key = `${period}:${count}`;
    if (count <= 0 || ran.current === key) return;
    ran.current = key;
    generateFixedForPeriod(period, true).then((res) => {
      if (res.ok) router.refresh();
    });
  }, [period, count, router]);

  return null;
}
