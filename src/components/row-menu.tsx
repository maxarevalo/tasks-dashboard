"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export type RowMenuItem = {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
};

const MENU_WIDTH = 224; // w-56
const ROW_HEIGHT = 38;

export function RowMenu({ items }: { items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.min(
        Math.max(8, r.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8,
      );
      const menuHeight = items.length * ROW_HEIGHT + 8;
      const spaceBelow = window.innerHeight - r.bottom;
      const top =
        spaceBelow < menuHeight + 16
          ? Math.max(8, r.top - 4 - menuHeight)
          : r.bottom + 4;
      setPos({ top, left });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Opciones"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open &&
        pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setOpen(false)}
            />
            <div
              role="menu"
              style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
              className="fixed z-[70] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
            >
              {items.map((it, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                    it.danger
                      ? "text-red-600 hover:bg-red-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {it.icon}
                  {it.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
