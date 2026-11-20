/**
 * The style layer: one art direction per video, declared where the plan is,
 * never in scene code (docs/styles/).
 *
 * A style is tokens + the two skins the frame itself needs:
 *   palette  the roles scenes already read (§6) — a style never makes a scene
 *            import hex codes;
 *   caption  how the running caption is dressed (stroke weight, case, size);
 *   stage    the backdrop under scenes that do not fill the frame.
 *
 * A video names its style in `narration.json` → `style` (or `video.json` →
 * `style` for a voiceless promo) and a scene or shot may override it. Unknown
 * ids fall back to `kit`, so an old video renders exactly as before.
 *
 * Tokens of the eight looks live in `../fixtures/Look.tsx` (the look library
 * the demos were built with); this module is the registry the pipeline reads.
 */
import React from "react";
import {LOOKS, Stage, TYPE, type Look} from "../fixtures/Look";
import {Backdrop} from "../frame/Backdrop";
import {DEFAULT_PALETTE, type Palette} from "../theme";

/** How the running caption is dressed (§7). Every field defaults to the kit's. */
export type CaptionSkin = {
  size: number;
  weight: number;
  uppercase: boolean;
  /** Outline drawn behind the glyphs (paint-order: stroke fill). */
  strokeColor: string;
  strokeWidth: number;
  shadow: string;
};

export type Style = {
  id: string;
  label: string;
  /** When false the style is light-on-paper: the caption outline inverts. */
  dark: boolean;
  palette: Palette;
  /** Look of look-based styles (null = the kit style: `palette` reflects it). */
  look: Look | null;
  /** Type scale used by scenes drawn in this style (docs/styles/). */
  type: Record<string, number>;
  caption: CaptionSkin;
};

/** The kit's caption skin: white on a black outline, uppercase, 900 (§7). */
const KIT_CAPTION: CaptionSkin = {
  size: 66,
  weight: 900,
  uppercase: true,
  strokeColor: "#000000",
  strokeWidth: 10,
  shadow: "0 6px 18px rgba(0,0,0,0.6)",
};

const lum = (hex: string) => {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(f, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** A caption skin whose stroke wins against the page: dark page → white stroke, light page → dark stroke. */
const captionFor = (palette: Palette): CaptionSkin => {
  const darkPage = lum(palette.bg) < 0.5;
  return {
    size: 66,
    weight: 900,
    uppercase: true,
    strokeColor: darkPage ? "#000000" : palette.deep,
    strokeWidth: 10,
    shadow: darkPage ? "0 6px 18px rgba(0,0,0,0.6)" : `0 4px 16px ${palette.deep}55`,
  };
};

const kitStyle = (): Style => ({
  id: "kit",
  label: "Kit",
  dark: true,
  palette: DEFAULT_PALETTE,
  look: null,
  type: TYPE,
  caption: KIT_CAPTION,
});

/** A look's tokens as a Style: palette built from the look's own colours. */
const lookStyle = (id: string, label: string, l: Look): Style => {
  const palette: Palette = {
    bg: l.bg[1],
    deep: l.shadow,
    surface: l.surface,
    accent: l.accent,
    accentSoft: l.accent2,
    warn: l.accent2,
    bad: l.dark ? "#FF4D4D" : l.accent,
    good: l.accent2,
    text: l.ink,
    muted: l.ink2,
  };
  return {
    id,
    label,
    dark: l.dark,
    palette,
    look: l,
    type: TYPE,
    caption: captionFor(palette),
  };
};

export const STYLES: Record<string, Style> = {
  kit: kitStyle(),
  midnight: lookStyle("midnight", "Midnight", LOOKS.midnight),
  aurora: lookStyle("aurora", "Aurora", LOOKS.aurora),
  ember: lookStyle("ember", "Ember", LOOKS.ember),
  graphite: lookStyle("graphite", "Graphite", LOOKS.graphite),
  lime: lookStyle("lime", "Lime", LOOKS.lime),
  paper: lookStyle("paper", "Paper", LOOKS.paper),
  porcelain: lookStyle("porcelain", "Porcelain", LOOKS.porcelain),
  sand: lookStyle("sand", "Sand", LOOKS.sand),
};

export const STYLE_IDS = Object.keys(STYLES);

/** Resolve a style id; an unknown id is the kit style, so old videos never break. */
export const getStyle = (id?: string | null): Style => (id && STYLES[id]) || STYLES.kit;

/**
 * Backdrop under scenes that do not fill the frame: the kit's gradient for the
 * kit style, the look's stage (light, space, vignette, grain) for the others.
 */
export const StyleBackdrop: React.FC<{style: Style; breathe?: number}> = ({style, breathe}) => {
  if (!style.look) return <Backdrop palette={style.palette} />;
  return <Stage look={style.look} breathe={breathe ?? 0.6} />;
};
