/** Isotipo Naive: una "C" con la línea de precio en acento (del pase de Claude Design). */
export function LogoMark({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl border-[3px] border-line bg-ink ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        viewBox="0 0 40 40"
        fill="none"
      >
        <path
          d="M28 8C22 8 17 13 17 20C17 27 22 32 28 32"
          stroke="var(--bg)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M12 24 L18 17 L22 21 L30 10"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      CAPITAL <span className="text-accent">CLASH</span>
    </span>
  );
}
