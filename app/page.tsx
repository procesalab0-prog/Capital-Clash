import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { btnGhost, btnPrimary, Card } from "@/components/ui";

const steps = [
  {
    title: "Formen su fondo",
    body: "Crea un grupo, invita a tus amigos con un código y acuerden la aportación de la temporada (~45 días).",
  },
  {
    title: "Propongan y voten",
    body: "Cada inversión se propone con una tesis y se somete a votación. Solo se ejecuta si la mayoría dice sí.",
  },
  {
    title: "Compitan y aprendan",
    body: "Sigue el valor del fondo contra el S&P 500. Al cierre se venden las posiciones y se corona al mejor estratega.",
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
      <section className="mx-auto max-w-3xl text-center">
        <p className="figures text-sm font-medium tracking-widest text-accent">
          EL JUEGO DE INVERSIÓN EN EQUIPO
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
          Tu fondo. Tu equipo.
          <br />
          Tu victoria.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ink2">
          Capital Clash convierte a tu grupo de amigos en un fondo de
          inversión: proponen acciones reales, votan cada decisión y compiten
          por el mejor rendimiento de la temporada.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className={btnPrimary}>
            Empezar a jugar
          </Link>
          <Link href="/login" className={btnGhost}>
            Ver la demo
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <Card key={s.title}>
            <p className="figures text-sm font-bold text-accent">{i + 1}</p>
            <h2 className="mt-1 font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-ink2">{s.body}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto mt-10 max-w-4xl">
        <Card>
          <h2 className="font-semibold">Reglas de la temporada</h2>
          <ul className="mt-3 grid gap-2 text-sm text-ink2 sm:grid-cols-2">
            {rules.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden className="text-accent">
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
