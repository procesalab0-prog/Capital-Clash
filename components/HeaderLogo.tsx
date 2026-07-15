"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { LogoMark, Wordmark } from "@/components/Logo";
import { btnGhost } from "@/components/ui";
import { APP_VERSION } from "@/lib/version";

const TAPS_TO_REVEAL = 6;
const TAP_WINDOW_MS = 1500;

/**
 * Logo del header. Easter egg: 6 toques seguidos (en menos de 1.5s entre
 * cada uno) muestran la versión de la app y el crédito de ProcesaLab.
 * El layout raíz persiste entre navegaciones de Next.js, así que el conteo
 * de toques sobrevive aunque cada click también navegue.
 */
export function HeaderLogo({ href }: { href: string }) {
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const taps = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    taps.current += 1;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      taps.current = 0;
    }, TAP_WINDOW_MS);

    if (taps.current >= TAPS_TO_REVEAL) {
      taps.current = 0;
      setShowEasterEgg(true);
    }
  }

  return (
    <>
      <Link href={href} className="flex items-center gap-3" onClick={handleClick}>
        <LogoMark size={40} />
        <span className="leading-tight">
          <Wordmark className="block text-lg" />
          <span className="hidden text-[10px] font-bold uppercase tracking-widest text-muted sm:block">
            Tu fondo. Tu equipo. Tu victoria.
          </span>
        </span>
      </Link>

      {showEasterEgg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setShowEasterEgg(false)}
        >
          <div
            className="hard-shadow-accent w-full max-w-xs rounded-2xl border-[3px] border-line bg-surface p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <LogoMark size={56} className="mx-auto" />
            <p className="mt-3 text-lg font-black tracking-tight">
              CAPITAL <span className="text-accent">CLASH</span>
            </p>
            <p className="figures mt-1 text-sm font-bold text-muted">
              v{APP_VERSION}
            </p>
            <p className="mt-3 text-sm font-semibold text-ink2">
              Creado por <span className="font-black text-accent">ProcesaLab</span>
            </p>
            <button
              type="button"
              onClick={() => setShowEasterEgg(false)}
              className={`${btnGhost} mt-4 w-full`}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
