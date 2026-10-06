// web/src/components/visual/RiverBackground.tsx
// A custom SVG motif: layered river contour lines that slowly drift,
// referencing the Dnipro river's path. Used in place of generic
// radial-gradient "glow blob" backgrounds.

export function RiverBackground({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 1200 800"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="river-line-1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3aab9e" stopOpacity="0" />
          <stop offset="50%" stopColor="#3aab9e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3aab9e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="river-line-2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e6a431" stopOpacity="0" />
          <stop offset="50%" stopColor="#e6a431" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#e6a431" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Main river channel — wide, slow drift */}
      <path
        d="M -100 320 C 150 280, 300 420, 500 380 C 700 340, 850 460, 1100 400 C 1250 370, 1350 410, 1500 380"
        stroke="url(#river-line-1)"
        strokeWidth="120"
        strokeLinecap="round"
        className="animate-drift-slow"
      />

      {/* Secondary tributary line */}
      <path
        d="M -100 480 C 200 520, 380 440, 600 500 C 820 560, 980 480, 1300 540"
        stroke="url(#river-line-2)"
        strokeWidth="60"
        strokeLinecap="round"
        className="animate-drift"
      />

      {/* Thin contour accent lines — flowing dash animation */}
      <path
        d="M -50 250 C 200 220, 350 320, 550 290 C 750 260, 900 350, 1150 300"
        stroke="#6cc9bc"
        strokeOpacity="0.18"
        strokeWidth="1.5"
        strokeDasharray="6 10"
        className="animate-river-flow"
      />
      <path
        d="M -50 560 C 220 600, 400 520, 640 570 C 880 620, 1020 540, 1260 590"
        stroke="#f4d68d"
        strokeOpacity="0.15"
        strokeWidth="1.5"
        strokeDasharray="4 12"
        className="animate-river-flow"
        style={{ animationDirection: 'reverse', animationDuration: '18s' }}
      />
    </svg>
  );
}
