import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/data/provider";
import { getSessionUser } from "@/lib/session";
import { demoLoginAction } from "@/app/actions";
import { Card, PageTitle } from "@/components/ui";
import { SupabaseLoginForm } from "@/components/SupabaseLoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/grupos");

  if (!isDemoMode()) {
    return (
      <div className="mx-auto max-w-sm py-10">
        <PageTitle
          title="Entrar"
          subtitle="Inicia sesión o crea tu cuenta para jugar."
        />
        <SupabaseLoginForm />
      </div>
    );
  }

  const { DEMO_USERS } = await import("@/lib/data/demo");
  return (
    <div className="mx-auto max-w-md py-10">
      <PageTitle
        title="Modo demo"
        subtitle="Elige con qué jugador entrar. Puedes salir y volver a entrar como otro jugador para simular la votación del grupo."
      />
      <div className="grid gap-3">
        {DEMO_USERS.map((u) => (
          <form key={u.id} action={demoLoginAction}>
            <input type="hidden" name="userId" value={u.id} />
            <button type="submit" className="w-full text-left">
              <Card className="flex items-center gap-3 transition hover:border-accent">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft font-bold text-accent">
                  {u.displayName[0]}
                </span>
                <div>
                  <p className="font-semibold">{u.displayName}</p>
                  <p className="text-xs text-muted">
                    {u.id === "u-emma"
                      ? "Administradora del grupo demo"
                      : "Miembro del grupo demo"}
                  </p>
                </div>
              </Card>
            </button>
          </form>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        Sin Supabase configurado, Capital Clash corre con datos de ejemplo en
        memoria. Conecta Supabase para cuentas reales (ver README).
      </p>
    </div>
  );
}
