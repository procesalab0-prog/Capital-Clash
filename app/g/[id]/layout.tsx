import type { ReactNode } from "react";
import { getGroupContext } from "@/lib/loaders";
import { fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui";
import { GroupTabs } from "@/components/GroupTabs";
import { CopyInvite } from "@/components/CopyInvite";

export default async function GroupLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getGroupContext(id);
  const { group, season } = ctx;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {group.name}
            </h1>
            <Badge tone={group.mode === "real" ? "accent" : "neutral"}>
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
        <CopyInvite code={group.inviteCode} />
      </div>
      <GroupTabs groupId={group.id} />
      <div className="pt-5">{children}</div>
    </div>
  );
}
