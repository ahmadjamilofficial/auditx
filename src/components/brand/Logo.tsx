import wabLogoWhite from "@/assets/wab-logo-white.png.asset.json";
import wabLogoBlack from "@/assets/wab-logo-black.png.asset.json";

/**
 * Wab brand mark. Two uploaded variants:
 *  - white monogram → shown in dark theme
 *  - black monogram → shown in light theme
 */

/** Mark only (no wordmark) — sidebar rail, compact spots. */
export function LogoIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 ${className ?? ""}`} style={{ width: size, height: size }}>
      <img src={wabLogoWhite.url} alt="Wab" className="hidden dark:block" style={{ width: size, height: size, objectFit: "contain" }} />
      <img src={wabLogoBlack.url} alt="Wab" className="block dark:hidden" style={{ width: size, height: size, objectFit: "contain" }} />
    </span>
  );
}

/** Full logo: mark + lowercase wordmark. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <LogoIcon size={size} />
      <span className="text-lg font-semibold lowercase tracking-tight">wab</span>
    </span>
  );
}

/** Legacy alias — call sites that render a bare mark with a fill color. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return <LogoIcon size={size} className={className} />;
}
