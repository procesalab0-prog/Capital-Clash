import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { isDemoMode } from "@/lib/data/provider";
import { getSessionUser } from "@/lib/session";
import { logoutAction } from "@/app/actions";
import { Badge } from "@/components/ui";
import { LogoMark, Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Capital Clash",
  description:
    "El juego de estrategia financiera para invertir en equipo: forma un fondo con tus amigos, vota cada inversión y compite por el mejor rendimiento.",
  applicationName: "Capital Clash",
  appleWebApp: {
    capable: true,
    title: "Capital Clash",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F1E4",
};

/** Aplica el tema guardado (o el del sistema) antes del primer paint. */
const themeScript = `try{var t=localStorage.getItem('cc-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const demo = isDemoMode();
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
        />
      </head>
      <body className={`${jetbrains.variable} min-h-screen antialiased`}>
        <header className="sticky top-0 z-20 border-b-[3px] border-line bg-bg">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
            <Link href={user ? "/grupos" : "/"} className="flex items-center gap-3">
              <LogoMark size={40} />
              <span className="leading-tight">
                <Wordmark className="block text-lg" />
                <span className="hidden text-[10px] font-bold uppercase tracking-widest text-muted sm:block">
                  Tu fondo. Tu equipo. Tu victoria.
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              {demo && <Badge tone="ink">Modo demo</Badge>}
              <ThemeToggle />
              {user ? (
                <form action={logoutAction} className="flex items-center gap-2">
                  <span className="hidden text-sm font-bold sm:inline">
                    {user.displayName}
                  </span>
                  <button
                    type="submit"
                    className="text-sm font-bold text-muted transition hover:text-accent"
                  >
                    Salir
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-extrabold text-accent hover:underline"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4 text-xs font-semibold text-muted">
          Capital Clash es un juego educativo entre amigos. No es asesoría
          financiera ni una casa de bolsa.
        </footer>
      </body>
    </html>
  );
}
