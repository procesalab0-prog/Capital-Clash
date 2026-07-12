import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { isDemoMode } from "@/lib/data/provider";
import { getSessionUser } from "@/lib/session";
import { logoutAction } from "@/app/actions";
import { Badge } from "@/components/ui";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Capital Clash",
  description:
    "El juego de estrategia financiera para invertir en equipo: forma un fondo con tus amigos, vota cada inversión y compite por el mejor rendimiento.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const demo = isDemoMode();
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <Link
              href={user ? "/grupos" : "/"}
              className="flex items-center gap-2 font-bold tracking-tight"
            >
              <span className="figures grid h-7 w-7 place-items-center rounded-lg bg-accent text-[11px] font-black tracking-tighter text-white">
                CC
              </span>
              Capital Clash
            </Link>
            <div className="flex items-center gap-3">
              {demo && <Badge tone="warn">Modo demo</Badge>}
              {user ? (
                <form action={logoutAction} className="flex items-center gap-3">
                  <span className="text-sm text-ink2">{user.displayName}</span>
                  <button
                    type="submit"
                    className="text-sm text-muted hover:text-ink"
                  >
                    Salir
                  </button>
                </form>
              ) : (
                <Link href="/login" className="text-sm text-accent hover:underline">
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4 text-xs text-muted">
          Capital Clash es un juego educativo entre amigos. No es asesoría
          financiera ni una casa de bolsa.
        </footer>
      </body>
    </html>
  );
}
