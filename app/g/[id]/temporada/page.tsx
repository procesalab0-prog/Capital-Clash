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
        <p className="hard-shadow-sm rounded-xl border-[3px] border-loss bg-surface px-3 py-2 text-sm font-bold text-loss">
          ⚠ {decodeURIComponent(error)}
        </p>
      )}

      {active ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold">{active.name}</h2>
              <p className="mt-1 text-sm font-semibold text-ink2">
                {fmtDate(active.startDate)} → {fmtDate(active.endDate)}
              </p>
              <p className="text-sm font-semibold text-muted">
                Aportación: {fmtMoney(active.contributionAmount)} por jugador ·
                capital inicial {fmtMoney(ctx.initialCapital)}
                {summary && ` · valor actual ${fmtMoney(summary.fundValue)}`}
              </p>
            </div>
            <Badge tone="gain">Activa</Badge>
          </div>

          {(() => {
            const total = Math.max(1, daysBetween(active.startDate, active.endDate));
            const elapsed = Math.min(
              total,
              Math.max(0, daysBetween(active.startDate, todayISO())),
            );
            const left = Math.max(0, daysBetween(todayISO(), active.endDate));
            return (
              <div className="mt-5">
                <div className="h-3 overflow-hidden rounded-full border-2 border-line bg-bg">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.round((elapsed / total) * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs font-bold text-muted">
                  <span>
                    Día {elapsed} de {total}
                  </span>
                  <span>{left} días restantes</span>
                </div>
              </div>
            );
          })()}

          {isAdmin && (
            <div className="mt-5 rounded-xl border-[2.5px] border-dashed border-line p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">
                Panel de admin
              </h3>
              <p className="mt-1.5 text-sm font-semibold text-ink2">
                Al cerrar la temporada se venden todas las posiciones al precio
                actual, se congela el ranking final y comienza la celebración
                con podio. Esta acción no se puede deshacer.
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
