import Link from "next/link";
import { getProvider } from "@/lib/data/provider";
import { requireUser } from "@/lib/loaders";
import { createGroupAction, joinGroupAction } from "@/app/actions";
import {
  Badge,
  btnPrimary,
  btnGhost,
  Card,
  EmptyState,
  inputCls,
  PageTitle,
} from "@/components/ui";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const provider = await getProvider();
  const groups = await provider.getGroupsForUser(user.id);
  const { error } = await searchParams;

  return (
    <div>
      <PageTitle
        title="Mis grupos"
        subtitle="Cada grupo es un fondo de inversión con sus propias temporadas."
      />

      {error && (
        <p className="hard-shadow-sm mb-4 rounded-xl border-[3px] border-loss bg-surface px-3 py-2 text-sm font-bold text-loss">
          ⚠ {decodeURIComponent(error)}
        </p>
      )}

      {groups.length === 0 ? (
        <EmptyState
          title="Todavía no estás en ningún grupo"
          hint="Crea tu propio fondo o únete a uno con el código de invitación que te compartan."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <Link key={g.id} href={`/g/${g.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-extrabold">{g.name}</p>
                  <Badge tone={g.mode === "real" ? "accent" : "ink"}>
                    {g.mode === "real" ? "Dinero real" : "Simulado"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {g.memberCount}{" "}
                  {g.memberCount === 1 ? "jugador" : "jugadores"} ·{" "}
                  {g.role === "admin" ? "eres admin" : "miembro"}
                </p>
                <div className="mt-4 flex justify-end">
                  <span className="figures rounded-lg border-2 border-dashed border-line px-2.5 py-1 text-xs">
                    {g.inviteCode}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Card>
          <h2 className="font-extrabold">+ Crear un grupo</h2>
          <form action={createGroupAction} className="mt-3 grid gap-3">
            <input
              name="name"
              className={inputCls}
              placeholder="Nombre del grupo (ej. Los Lobos de la Bolsa)"
              required
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border-[2.5px] border-line bg-bg px-3 py-2">
                <input type="radio" name="mode" value="simulado" defaultChecked />
                <span>
                  <span className="font-extrabold">Simulado</span>
                  <span className="block text-xs font-semibold text-muted">
                    Capital virtual, ejecución automática
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border-[2.5px] border-line bg-bg px-3 py-2">
                <input type="radio" name="mode" value="real" />
                <span>
                  <span className="font-extrabold">Dinero real</span>
                  <span className="block text-xs font-semibold text-muted">
                    La app registra; el dinero vive en su broker
                  </span>
                </span>
              </label>
            </div>
            <button className={btnPrimary}>+ Crear grupo</button>
          </form>
        </Card>

        <Card>
          <h2 className="font-extrabold">Unirme con código</h2>
          <p className="mt-1 text-sm font-semibold text-muted">
            Pide a quien creó el grupo su código de invitación.
          </p>
          <form action={joinGroupAction} className="mt-3 flex gap-2">
            <input
              name="code"
              className={`${inputCls} figures uppercase`}
              placeholder="TOROS1"
              maxLength={8}
              required
            />
            <button className={btnGhost}>Unirme</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
