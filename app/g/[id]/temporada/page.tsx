import { closeSeasonAction, createSeasonAction } from "@/app/actions";
import { getGroupContext } from "@/lib/loaders";
import { daysBetween, fmtDate, fmtMoney, todayISO } from "@/lib/format";
import {
  Badge,
  btnPrimary,
  Card,
  inputCls,
  PageTitle,
} from "@/components/ui";

export default async function SeasonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const ctx = await getGroupContext(id);
  const { group, seasons, role, members, summary } = ctx;
  const active = seasons.find((s) => s.status === "active") ?? null;
  const isAdmin = role === "admin";

  return (
    <div className="grid gap-4">
      <PageTitle
        title="Temporada"
        subtitle="La unidad de juego: aportación fija, ~45 días, y al final se corona al campeón."
      />
      {error && (
        <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          ⚠ {decodeURIComponent(error)}
        </p>
      )}

      {active ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">{active.name}</h2>
              <p className="mt-1 text-sm text-ink2">
                {fmtDate(active.startDate)} → {fmtDate(active.endDate)} ·{" "}
                {Math.max(0, daysBetween(todayISO(), active.endDate))} días
                restantes
              </p>
              <p className="text-sm text-muted">
                Aportación: {fmtMoney(active.contributionAmount)} por jugador ·
                capital inicial {fmtMoney(ctx.initialCapital)}
                {summary && ` · valor actual ${fmtMoney(summary.fundValue)}`}
              </p>
            </div>
            <Badge tone="gain">Activa</Badge>
          </div>

          {isAdmin && (
            <div className="mt-4 rounded-lg border border-line p-3">
              <h3 className="text-sm font-semibold">Cerrar temporada</h3>
              <p className="mt-1 text-xs text-muted">
                Se venden todas las posiciones al precio actual, se calcula el
                rendimiento final y se publica el ranking. Esta acción no se
                puede deshacer.
              </p>
              <form
                action={closeSeasonAction.bind(null, group.id, active.id)}
                className="mt-3"
              >
                <button className={btnPrimary}>
                  Cerrar temporada y coronar al campeón 🏁
                </button>
              </form>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <h2 className="font-semibold">Nueva temporada</h2>
          {isAdmin ? (
            <form
              action={createSeasonAction.bind(null, group.id)}
              className="mt-3 grid max-w-md gap-3"
            >
              <input
                name="name"
                className={inputCls}
                placeholder={`Nombre (ej. Temporada ${seasons.length + 1})`}
              />
              <div>
                <label className="mb-1 block text-xs text-muted">
                  Aportación por participante (USD)
                </label>
                <input
                  name="contribution"
                  className={inputCls}
                  type="number"
                  min="1"
                  step="0.01"
                  defaultValue={500}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">
                  Duración (días)
                </label>
                <input
                  name="duration"
                  className={inputCls}
                  type="number"
                  min="7"
                  max="120"
                  defaultValue={45}
                  required
                />
              </div>
              <p className="text-xs text-muted">
                Participarán los {members.length} miembros actuales del grupo.
                Empieza hoy.
              </p>
              <button className={btnPrimary}>Iniciar temporada</button>
            </form>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Solo el administrador del grupo puede iniciar una temporada.
            </p>
          )}
        </Card>
      )}

      {seasons.filter((s) => s.status === "closed").length > 0 && (
        <Card>
          <h2 className="font-semibold">Temporadas anteriores</h2>
          <ul className="mt-2 grid gap-2 text-sm">
            {seasons
              .filter((s) => s.status === "closed")
              .map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted">
                    {fmtDate(s.startDate)} → {fmtDate(s.endDate)}
                  </span>
                  <span className="figures">
                    {s.finalValue !== null ? fmtMoney(s.finalValue) : "—"}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
