import wabLogoWhite from "@/assets/wab-logo-white.png.asset.json";
import wabLogoBlack from "@/assets/wab-logo-black.png.asset.json";

/**
 * Wab brand mark. Two uploaded variants:
 *  - white monogram → used on dark surfaces (dark theme)
 *  - black monogram → used on light surfaces (light theme)
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <>
      <img
        src={wabLogoWhite.url}
        alt=""
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
        style={{ width: size, height: size, objectFit: "contain", display: "none" }}
        data-theme-variant="dark"
      />
      <img
        src={wabLogoBlack.url}
        alt=""
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
        style={{ width: size, height: size, objectFit: "contain", display: "none" }}
        data-theme-variant="light"
      />
    </>
  );
}

/** Picks the visible variant via CSS: white in .dark, black otherwise. */
function variantCss(size: number) {
  return `
.wab-mark { display: inline-flex; }
.wab-mark img { display: none; }
.wab-mark img[data-theme-variant="light"] { display: block; }
.dark .wab-mark img[data-theme-variant="light"] { display: none; }
.dark .wab-mark img[data-theme-variant="dark"] { display: block; }
`;
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="wab-mark" style={{ width: size, height: size }}>
        <LogoVariantMark size={size} css="" />
      </span>
      <span className="text-lg font-semibold lowercase tracking-tight">wab</span>
    </span>
  );
}

function LogoVariantMark({ size }: { size: number; css?: string }) {
  return (
    <span className="contents">
      <img src={wabLogoWhite.url} alt="" data-theme-variant="dark" style={{ width: size, height: size, objectFit: "contain", display: "none" }} />
      <img src={wabLogoBlack.url} alt="" data-theme-variant="light" style={{ width: size, height: size, objectFit: "contain", display: "none" }} />
    </span>
  );
}

/** Mark only (no wordmark) — for the sidebar rail, favicon-style spots. */
export function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <span className="wab-mark" style={{ width: size, height: size }}>
      <img src={wabLogoWhite.url} alt="Wab" data-theme-variant="dark" style={{ width: size, height: size, objectFit: "contain", display: "none" }} />
      <img src={wabLogoBlack.url} alt="Wab" data-theme-variant="light" style={{ width: size, height: size, objectFit: "contain", display: "none" }} />
    </span>
  );
}

export const WabVariantCss = variantCss;
