"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { slug: "", label: "Dashboard" },
  { slug: "mercado", label: "Mercado" },
  { slug: "portafolio", label: "Portafolio" },
  { slug: "propuestas", label: "Propuestas" },
  { slug: "participantes", label: "Participantes" },
  { slug: "historial", label: "Historial" },
  { slug: "ranking", label: "Ranking" },
  { slug: "temporada", label: "Temporada" },
];

export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/g/${groupId}`;
  return (
    <nav className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="flex w-max gap-2">
        {tabs.map((t) => {
          const href = t.slug ? `${base}/${t.slug}` : base;
          const active = pathname === href;
          return (
            <Link
              key={t.slug}
              href={href}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                active
                  ? "bg-ink text-bg"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
