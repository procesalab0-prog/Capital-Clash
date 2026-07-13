import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/data/provider";
import { getSessionUser } from "@/lib/session";
import { demoLoginAction } from "@/app/actions";
import { Avatar, Badge, Card } from "@/components/ui";
import { LogoMark } from "@/components/Logo";
import { SupabaseLoginForm } from "@/components/SupabaseLoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/grupos");

  if (!isDemoMode()) {
    return (
      <div className="mx-auto max-w-sm py-10">
        <div className="mb-6 flex items-center gap-4">
          <LogoMark size={54} />
          <div className="rounded-2xl rounded-bl-md border-[3px] border-line bg-surface px-4 py-2.5 text-sm font-extrabold">
            ¿Quién juega hoy?
          </div>
        </div>
        <SupabaseLoginForm />
      </div>
    );
  }

  const { DEMO_USERS } = await import("@/lib/data/demo");
  return (
    <div className="mx-auto max-w-md py-10">
      <div className="mb-4 flex items-center gap-4">
        <LogoMark size={54} />
        <div className="rounded-2xl rounded-bl-md border-[3px] border-line bg-surface px-4 py-2.5 text-sm font-extrabold">
          ¿Quién juega hoy?
        </div>
      </div>
      <div className="mb-5">
        <Badge tone="ink">Modo demo</Badge>
      </div>
      <div className="grid gap-3">
        {DEMO_USERS.map((u) => (
          <form key={u.id} action={demoLoginAction}>
            <input type="hidden" name="userId" value={u.id} />
            <button type="submit" className="w-full text-left">
              <Card className="hard-shadow-sm flex items-center gap-4 !p-4 transition hover:-translate-y-0.5">
                <Avatar userId={u.id} name={u.displayName} size={44} />
                <div className="flex-1">
                  <p className="text-[15px] font-extrabold">{u.displayName}</p>
                  <p className="text-xs font-semibold text-muted">
                    {u.id === "u-emma"
                      ? "Admin del grupo demo"
                      : "Miembro del grupo demo"}
                  </p>
                </div>
                <span aria-hidden className="text-xl font-black">
                  ›
                </span>
              </Card>
            </button>
          </form>
        ))}
      </div>
      <p className="mt-5 text-xs font-semibold text-muted">
        Sin Supabase configurado, Capital Clash corre con datos de ejemplo en
        memoria. Sal y entra como otro jugador para simular la votación del
        grupo. Conecta Supabase para cuentas reales (ver README).
      </p>
    </div>
  );
}
