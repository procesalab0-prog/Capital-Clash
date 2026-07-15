import { PageSkeleton } from "@/components/Skeleton";

/**
 * Se muestra al instante al cambiar de pestaña dentro de un grupo (Next.js
 * envuelve la página en un Suspense con este fallback), mientras las
 * consultas reales (Supabase/precios) terminan de resolver. Sin esto, el
 * cambio de pestaña se siente congelado durante ese tiempo de red.
 */
export default function Loading() {
  return <PageSkeleton />;
}
