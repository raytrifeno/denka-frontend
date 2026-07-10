/**
 * BrandMark — logo Denka Computer: simbol prompt terminal ">_" di atas
 * kotak amber. Motif "prompt" mewakili dunia teknisi komputer dan dipakai
 * konsisten di sidebar, halaman login, dan favicon.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#F59E0B" />
      <path
        d="M9 10.5 15.5 16 9 21.5"
        stroke="#14253B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M17.5 22h6.5" stroke="#14253B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Lockup teks brand — nama toko dengan wajah display. */
export function BrandLockup({ terang = false }: { terang?: boolean }) {
  return (
    <div className="min-w-0 leading-tight">
      <p
        className={
          "font-display truncate text-[15px] font-bold tracking-tight " +
          (terang ? "text-white" : "text-foreground")
        }
      >
        Denka Computer
      </p>
      <p className={"truncate text-[11px] " + (terang ? "text-white/55" : "text-muted-foreground")}>
        POS &amp; Service System
      </p>
    </div>
  );
}
