/**
 * Icon set: inline SVG, 24×24 grid, 1.6 stroke.
 *
 * Inline rather than a package: there are eleven of them, they ship as part of
 * the markup with no extra request, and they inherit `currentColor` so both
 * themes are handled for free.
 */

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

function Svg({
  size = 16,
  className,
  strokeWidth = 1.6,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Meridian mark: a stacked container block seen in three-quarter view. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="brand__mark"
    >
      <path d="M16 3 28 9.4v13.2L16 29 4 22.6V9.4L16 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M16 3v26M4 9.4l12 6.6 12-6.6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" opacity="0.45" />
      <rect x="10.4" y="13.2" width="11.2" height="3.1" rx="0.5" fill="currentColor" />
      <rect x="10.4" y="17.6" width="11.2" height="3.1" rx="0.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Svg>
);

export const SystemIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="4" width="19" height="12.5" rx="1.5" />
    <path d="M8 20.5h8M12 16.5v4" />
  </Svg>
);

export const ExpandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.5 3.5h-5v5M15.5 3.5h5v5M15.5 20.5h5v-5M8.5 20.5h-5v-5" />
  </Svg>
);

export const CollapseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8.5h5v-5M20.5 8.5h-5v-5M20.5 15.5h-5v5M3.5 15.5h5v5" />
  </Svg>
);

export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v11m0 0 4.2-4.2M12 14 7.8 9.8M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
  </Svg>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M12 19V5m0 0-6 6m6-6 6 6" />
  </Svg>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M12 5v14m0 0 6-6m-6 6-6-6" />
  </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15m0 0-6-6m6 6-6 6" />
  </Svg>
);

export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8 22 8l-10 5.2L2 8l10-5.2Z" />
    <path d="m2 13 10 5.2L22 13M2 17.4l10 5.2 10-5.2" opacity="0.6" />
  </Svg>
);

export const LinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7" />
  </Svg>
);

export const PulseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12h4l2.5-7 5 14 2.5-7h5" />
  </Svg>
);

export const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" />
  </Svg>
);

export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8 20 6v6.2c0 4.6-3.3 7.9-8 9.2-4.7-1.3-8-4.6-8-9.2V6l8-3.2Z" />
    <path d="m8.8 12 2.3 2.3 4.1-4.6" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5.5 5.5 13 13m0-13-13 13" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 22 20.5H2L12 3.5Z" />
    <path d="M12 10v4.5M12 17.6v.1" />
  </Svg>
);

export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.9v.1" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6.8V12l3.4 2" />
  </Svg>
);

export const BarChartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <rect x="5" y="11" width="3.6" height="7" rx="1" />
    <rect x="10.2" y="6" width="3.6" height="12" rx="1" />
    <rect x="15.4" y="14" width="3.6" height="4" rx="1" />
  </Svg>
);

export const SortIcon = ({ dir, ...p }: IconProps & { dir?: "asc" | "desc" }) => (
  <Svg {...p} size={p.size ?? 11}>
    <path d="M12 4v16" opacity="0" />
    <path d="m7 10 5-5 5 5" opacity={dir === "desc" ? 0.25 : 1} />
    <path d="m17 14-5 5-5-5" opacity={dir === "asc" ? 0.25 : 1} />
  </Svg>
);
