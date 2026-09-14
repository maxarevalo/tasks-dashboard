"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "./types";

export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function exec(run: () => Promise<ActionResult>, onDone?: () => void) {
    setError(null);
    start(async () => {
      const res = await run();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return { pending, error, exec, setError };
}
