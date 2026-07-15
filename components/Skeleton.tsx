/** Bloque placeholder pulsante mientras carga el contenido real. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-line/40 ${className}`}
      aria-hidden
    />
  );
}

/** Skeleton genérico de página de grupo: título + tarjetas. Se muestra al
 * instante durante la navegación entre pestañas, mientras los datos reales
 * (que sí requieren red) terminan de llegar. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="mt-2 h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border-[3px] border-line bg-surface p-5"
          >
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-3 h-8 w-28" />
            <SkeletonBlock className="mt-3 h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
