/**
 * Brand mark: a manila folder wearing a cobalt filing label — the same label
 * system every file in the app wears, applied to the app itself.
 */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`${className} relative grid shrink-0 place-items-center`}>
      <svg viewBox="0 0 40 34" className="h-full w-full" aria-hidden>
        <path
          d="M2 6.5C2 5.1 3.1 4 4.5 4h10.2c.8 0 1.5.3 2 .9l2.1 2.4h14.7c1.4 0 2.5 1.1 2.5 2.5V28c0 1.4-1.1 2.5-2.5 2.5h-29A2.5 2.5 0 0 1 2 28V6.5Z"
          fill="#cf9f35"
        />
        <path
          d="M2 12.6c0-1.4 1.1-2.5 2.5-2.5h31c1.4 0 2.6 1.2 2.4 2.6l-1.8 15.3a2.5 2.5 0 0 1-2.5 2.2H4.4a2.5 2.5 0 0 1-2.4-2.2V12.6Z"
          fill="#e6c05c"
        />
        {/* The filing label, slightly askew like a real one. */}
        <g transform="rotate(-3 20 21.5)">
          <rect x="8" y="16.5" width="24" height="10" rx="2" fill="var(--accent)" />
          <path d="M12.5 21.5h15" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </svg>
    </span>
  );
}

/** Wordmark: the product name set like a filing label — mono caps, tracked wide. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-mono text-[13px] font-bold uppercase tracking-[0.18em] ${className}`}
    >
      File Agent
    </span>
  );
}
