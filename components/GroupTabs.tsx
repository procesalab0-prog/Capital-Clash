"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { slug: "", label: "Dashboard" },
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
    <nav className="-mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-1 border-b border-line pb-0">
        {tabs.map((t) => {
          const href = t.slug ? `${base}/${t.slug}` : base;
          const active = pathname === href;
          return (
            <Link
              key={t.slug}
              href={href}
              className={`whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition ${
                active
                  ? "border-accent text-ink"
                  : "border-transparent text-muted hover:text-ink2"
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
