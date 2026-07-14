import Image from "next/image";

export type MascotPose =
  | "selfie"
  | "binoculares"
  | "laptop"
  | "caminando-guino"
  | "caminando-selfie";

/** La mascota de Capital Clash, en una de sus poses ilustradas. */
export function Mascot({
  pose,
  size = 96,
  className = "",
}: {
  pose: MascotPose;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={`/mascota/${pose}.png`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`rounded-2xl border-[3px] border-line object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
