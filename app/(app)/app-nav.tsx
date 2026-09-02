"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/crm", label: "CRM" },
  { href: "/propostas", label: "Propostas" },
  { href: "/vendas", label: "Vendas" },
  { href: "/checklist", label: "Checklist" },
  { href: "/mensagens", label: "Mensagens" },
  { href: "/links", label: "Links" },
];

function isActive(href: string, pathname: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // createPortal precisa do document.body — só existe no cliente.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fecha ao navegar (troca de rota) e ao apertar Escape.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Desktop — nav horizontal */}
      <nav className="hidden md:flex items-center gap-1 text-sm">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors",
              isActive(item.href, pathname)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Mobile — botão hambúrguer */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile — painel + backdrop.
          Portados pro document.body: o <header> tem backdrop-filter, que cria
          um containing block pra descendentes position:fixed e faria o backdrop
          (inset-0 top-14 / bottom-0) colapsar pra altura ~0. Fora do header,
          o fixed volta a se ancorar na viewport. */}
      {open && mounted
        ? createPortal(
            <>
              <div
                className="md:hidden fixed inset-0 top-14 z-40 bg-black/40"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <nav className="md:hidden fixed inset-x-0 top-14 z-50 flex flex-col border-b border-border bg-background p-2 text-sm shadow-lg">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "px-3 py-2.5 rounded-md transition-colors",
                      isActive(item.href, pathname)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
