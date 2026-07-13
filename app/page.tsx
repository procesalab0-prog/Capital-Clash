import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { btnPrimary, Card } from "@/components/ui";
import { LogoMark } from "@/components/Logo";

const steps = [
  {
    n: "1",
    color: "var(--yellow)",
    dark: true,
    title: "Formen su fondo",
    body: "Crea un grupo, invita con un código y acuerden la aportación de la temporada (~45 días).",
  },
  {
    n: "2",
    color: "var(--blue)",
    dark: false,
    title: "Propongan y voten",
    body: "Cada inversión lleva una tesis y se somete a votación. Solo se ejecuta si la mayoría dice sí.",
  },
  {
    n: "3",
    color: "var(--gain)",
    dark: true,
    title: "Compitan y aprendan",
    body: "Sigan el fondo contra el S&P 500. Al cierre se corona al mejor estratega en el podio.",
  },
];

const rules = [
  "Todos aportan la misma cantidad al iniciar la temporada.",
  "Cada temporada dura aproximadamente 45 días.",
  "Toda compra o venta queda registrada en el historial.",
  "Las decisiones se toman por mayoría de votos.",
  "Al cierre se venden todas las posiciones y se calcula el rendimiento.",
  "Se publica el ranking individual y del fondo.",
];

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/grupos");

  return (
    <div className="py-8 sm:py-14">
      <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <LogoMark size={96} className="hard-shadow-accent rounded-3xl border-4" />
        <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-tighter sm:text-7xl">
          CAPITAL
          <br />
          <span className="text-accent">CLASH</span>
        </h1>
        <p className="mt-4 text-lg font-extrabold tracking-tight">
          Tu fondo. Tu equipo. Tu victoria.
        </p>
        <p className="mx-auto mt-2 max-w-xl font-semibold text-ink2">
          Arma un fondo con tus amigos: propongan acciones reales, voten cada
          decisión y compitan por el mejor rendimiento de la temporada.
        </p>
        <Link href="/login" className={`${btnPrimary} mt-8 px-8 py-4 text-base`}>
          ¡Vamos a jugar! →
        </Link>
      </section>

      <section className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.n}>
            <span
              className="grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-line text-sm font-black"
              style={{ background: s.color, color: s.dark ? "#1d2633" : "#fff" }}
              aria-hidden
            >
              {s.n}
            </span>
            <h2 className="mt-3 font-extrabold">{s.title}</h2>
            <p className="mt-1 text-sm font-semibold text-ink2">{s.body}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto mt-8 max-w-4xl">
        <Card>
          <h2 className="font-extrabold">Reglas de la temporada</h2>
          <ul className="mt-3 grid gap-2 text-sm font-semibold text-ink2 sm:grid-cols-2">
            {rules.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden className="font-black text-gain">
                  ✓
                </span>
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
