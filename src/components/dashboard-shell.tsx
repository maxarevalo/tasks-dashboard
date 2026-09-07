"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X, LogOut, ArrowLeftRight } from "lucide-react";
import type { Section } from "@/lib/nav";
import { iconMap } from "@/lib/icons";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function DashboardShell({
  section,
  user,
  children,
}: {
  section: Section;
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === section.href ? pathname === href : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {section.nav.map((item) => {
        const Icon = iconMap[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.soon && (
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                Pronto
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const SectionIcon = iconMap[section.icon];

  const sidebarInner = (
    <>
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${section.accent} text-white`}
        >
          <SectionIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {section.label}
          </p>
          <p className="truncate text-xs text-slate-500">Dashboard</p>
        </div>
      </div>

      {nav}

      <div className="border-t border-slate-200 p-3">
        <Link
          href="/hub"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Cambiar sección
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-full bg-slate-50">
      {/* Sidebar escritorio */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebarInner}
      </aside>

      {/* Drawer móvil */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="flex-1 truncate text-sm font-semibold text-slate-900">
            {section.label}
          </h1>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Usuario"}
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                {user.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            )}
            <button
              type="button"
              onClick={() => signOut({ redirectTo: "/login" })}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Botón cerrar en drawer (visible sólo con teclado/lectores) */}
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed right-4 top-4 z-50 grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-600 shadow lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
