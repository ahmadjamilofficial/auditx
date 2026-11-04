/**
 * WAB brand mark — a monochrome geometric "WAB" monogram.
 *
 * Two uploaded variants, each meant for the surface it sits on:
 *  - light-logo.png: solid ink mark on white  → light theme
 *  - dark-logo.png : white mark, transparent   → dark theme
 *
 * The mark is never recoloured: it is black or white, exactly like the
 * brand source art. The legacy `fill` prop is accepted for old call sites
 * but ignored, because choosing by colour would break that rule.
 */

const WORDMARK = "WAB";

/** Mark only (no wordmark) — nav bars, sidebar rail, compact spots. */
export function LogoIcon({
  size = 28,
  className,
  tone = "auto",
}: {
  size?: number;
  className?: string | undefined;
  /** "auto" follows the theme; pin a variant on a fixed-colour surface. */
  tone?: "auto" | "onDark" | "onLight";
  fill?: string | undefined;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {tone === "auto" ? (
        <>
          <img
            src="/light-logo.png"
            alt="WAB"
            className="block size-full object-contain dark:hidden"
            draggable={false}
          />
          <img
            src="/dark-logo.png"
            alt="WAB"
            className="hidden size-full object-contain dark:block"
            draggable={false}
          />
        </>
      ) : (
        <img
          src={tone === "onDark" ? "/dark-logo.png" : "/light-logo.png"}
          alt="WAB"
          className="block size-full object-contain"
          draggable={false}
        />
      )}
    </span>
  );
}

/** Full lockup: monogram + uppercase wordmark set in tight, wide-tracked type. */
export function Logo({ size = 26, fill: _fill }: { size?: number; fill?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoIcon size={size} />
      <span
        className="text-[0.9rem] font-semibold uppercase leading-none"
        style={{ letterSpacing: "0.16em", color: "var(--color-text)" }}
      >
        {WORDMARK}
      </span>
    </span>
  );
}

/** Legacy alias — call sites that render a bare mark with a fill color. */
export function LogoMark({
  size = 32,
  className,
  fill,
}: {
  size?: number;
  className?: string | undefined;
  fill?: string | undefined;
}) {
  return <LogoIcon size={size} className={className} fill={fill} />;
}
