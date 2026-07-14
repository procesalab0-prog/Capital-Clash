import type { ReactNode } from "react";
import Link from "next/link";
import { getGroupContext } from "@/lib/loaders";
import { fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui";
import { GroupTabs } from "@/components/GroupTabs";
import { CopyInvite } from "@/components/CopyInvite";
import { GroupAdminMenu } from "@/components/GroupAdminMenu";

export default async function GroupLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getGroupContext(id);
  const { group, season, role } = ctx;

  return (
    <div>
      <Link
        href="/grupos"
        className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-accent hover:underline"
      >
        ← Mis grupos
      </Link>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {group.name}
            </h1>
            <Badge tone={group.mode === "real" ? "accent" : "ink"}>
              {group.mode === "real" ? "Dinero real" : "Simulado"}
            </Badge>
            {season && (
              <Badge tone={season.status === "active" ? "gain" : "neutral"}>
                {season.name}
                {season.status === "active"
                  ? ` · termina ${fmtDate(season.endDate)}`
                  : season.status === "closed"
                    ? " · cerrada"
                    : ""}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyInvite code={group.inviteCode} />
          {role === "admin" && (
            <GroupAdminMenu
              groupId={group.id}
              name={group.name}
              mode={group.mode}
            />
          )}
        </div>
      </div>
      <GroupTabs groupId={group.id} />
      <div className="pt-5">{children}</div>
    </div>
  );
}
