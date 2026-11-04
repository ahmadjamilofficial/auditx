import wabLogoWhite from "@/assets/wab-logo-white.png.asset.json";
import wabLogoBlack from "@/assets/wab-logo-black.png.asset.json";

/**
 * Wab brand mark. Two uploaded variants:
 *  - white monogram → shown in dark theme
 *  - black monogram → shown in light theme
 * The legacy `fill` prop is accepted for old call sites but ignored: the
 * correct variant is chosen by theme, not color.
 */

/** Mark only (no wordmark) — sidebar rail, compact spots. */
export function LogoIcon({ size = 28, className, fill: _fill }: { size?: number; className?: string | undefined; fill?: string | undefined }) {
  return (
    <span className={`inline-flex shrink-0 ${className ?? ""}`} style={{ width: size, height: size }}>
      <img src={wabLogoWhite.url} alt="Wab" className="hidden dark:block" style={{ width: size, height: size, objectFit: "contain" }} />
      <img src={wabLogoBlack.url} alt="Wab" className="block dark:hidden" style={{ width: size, height: size, objectFit: "contain" }} />
    </span>
  );
}

/** Full logo: mark + lowercase wordmark. */
export function Logo({ size = 28, fill: _fill }: { size?: number; fill?: string }) {
  return (
    <span className="flex items-center gap-2">
      <LogoIcon size={size} />
      <span className="text-lg font-semibold lowercase tracking-tight">wab</span>
    </span>
  );
}

/** Legacy alias — call sites that render a bare mark with a fill color. */
export function LogoMark({ size = 32, className, fill }: { size?: number; className?: string; fill?: string }) {
  return <LogoIcon size={size} className={className} fill={fill} />;
}
