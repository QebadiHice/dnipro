// web/src/components/icons/AdapterIcons.tsx
// Custom geometric line-art icon set for Dnipro.
// Replaces emoji with a coherent visual language: thin strokes,
// rounded joins, single-color, matching the river/wheat palette.

interface IconProps {
  className?: string;
  size?: number;
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// Lending — columns/pillars (bank ledger)
export function IconLending({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M4.5 9.5v9.5M9 9.5v9.5M15 9.5v9.5M19.5 9.5v9.5" />
      <path d="M2.5 19.5h19" />
      <path d="M2.5 9.5h19" />
    </svg>
  );
}

// Liquidity — overlapping waves (pool depth)
export function IconLiquidity({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M2.5 8.5c1.6-1.4 3.4-1.4 5 0s3.4 1.4 5 0 3.4-1.4 5 0 3.4 1.4 5 0" />
      <path d="M2.5 13c1.6-1.4 3.4-1.4 5 0s3.4 1.4 5 0 3.4-1.4 5 0 3.4 1.4 5 0" />
      <path d="M2.5 17.5c1.6-1.4 3.4-1.4 5 0s3.4 1.4 5 0 3.4-1.4 5 0 3.4 1.4 5 0" />
    </svg>
  );
}

// Real World Asset — wheat stalk (harvest / RWA)
export function IconRWA({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 21V6" />
      <path d="M12 6 8.5 8.5M12 6l3.5 2.5M12 9.5 8.5 12M12 9.5 15.5 12M12 13 8.5 15.5M12 13 15.5 15.5" />
      <circle cx="12" cy="4" r="1.4" />
    </svg>
  );
}

// Insurance — shield with checkmark notch
export function IconInsurance({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3 4.5 5.5v5c0 5 3.2 8.4 7.5 10 4.3-1.6 7.5-5 7.5-10v-5L12 3Z" />
      <path d="M9 12.2l2 2 4-4.2" />
    </svg>
  );
}

// Other / generic — node cluster
export function IconOther({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="12" cy="17" r="2" />
      <path d="M7.6 8.4 10.5 15.3M16.4 8.4 13.5 15.3M8 7h8" />
    </svg>
  );
}

export const CATEGORY_ICONS = [IconLending, IconLiquidity, IconRWA, IconInsurance, IconOther];

// ── Per-protocol marks ──────────────────────────────────────────────────────
// Simple monogram-in-hexagon marks, distinct per protocol but unified in style.

export function ProtocolMark({
  letter,
  className,
  size = 40,
}: {
  letter: string;
  className?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className}>
      <path
        d="M20 2 35.3 11v18L20 38 4.7 29V11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fontFamily="var(--font-mono, monospace)"
        fontWeight="500"
        fill="currentColor"
      >
        {letter}
      </text>
    </svg>
  );
}

// Wallet glyph — replaces emoji wallet icon
export function IconWallet({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h13A1.5 1.5 0 0 1 19 7.5V9h-3.5a3 3 0 0 0 0 6H19v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 16.5Z" />
      <path d="M19 9h.5A1.5 1.5 0 0 1 21 10.5v3a1.5 1.5 0 0 1-1.5 1.5H19" />
      <circle cx="14.5" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Empty-state inbox glyph — replaces emoji mailbox icon
export function IconEmpty({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 12 6 5h12l3 7" />
      <path d="M3 12v6.5A1.5 1.5 0 0 0 4.5 20h15a1.5 1.5 0 0 0 1.5-1.5V12" />
      <path d="M3 12h5l1.5 2.5h5L16 12h5" />
    </svg>
  );
}

// Brand mark — three river contour lines in a rounded square.
// Used as the logo throughout the site.
export function DniproMark({ className, size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" className={className}>
      <rect x="0.5" y="0.5" width="27" height="27" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.3" />
      <path d="M4 11c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M4 14.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M4 18c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
