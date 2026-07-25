/**
 * Brand mark: a folder whose tab is being lifted by an ascending arrow — the
 * two things this app does, in one glyph.
 */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`${className} relative grid shrink-0 place-items-center overflow-hidden rounded-[11px]`}
      style={{
        background: "linear-gradient(150deg, var(--jade) 0%, #0b6f7d 100%)",
        boxShadow: "inset 0 1px 0 #ffffff40, 0 1px 2px #00000040",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]">
        <path
          d="M3 18.2V7.6c0-.9.7-1.6 1.6-1.6h4.1c.5 0 1 .25 1.32.67l.96 1.33H19.4c.9 0 1.6.72 1.6 1.6v8.6c0 .88-.7 1.6-1.6 1.6H4.6c-.9 0-1.6-.72-1.6-1.6Z"
          stroke="#ffffff"
          strokeOpacity="0.92"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 17.2v-6.4M9.4 13.3 12 10.5l2.6 2.8"
          stroke="#ffffff"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Wordmark: the product name, plainly set — readable at a glance. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`text-[15px] font-semibold tracking-tight ${className}`}
    >
      File Agent
    </span>
  );
}
