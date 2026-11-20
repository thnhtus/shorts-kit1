import React from "react";
import {AbsoluteFill, Sequence} from "remotion";
import {STYLE_IDS, STYLES, StyleBackdrop} from "../../shared/style";
import {FONT} from "../../shared/theme";

/** One card per style, 4 s each: its backdrop, a headline in its type and its accent, plus its caption skin. The look-up sheet for docs/styles/. */
const SLOT = 120;
export const STYLES_FRAMES = SLOT * STYLE_IDS.length;

const Card: React.FC<{id: string}> = ({id}) => {
  const s = STYLES[id];
  const c = s.caption;
  const skin = c ?? {size: 66, weight: 900, uppercase: true, strokeColor: "#000000", strokeWidth: 10, shadow: "0 6px 18px rgba(0,0,0,0.6)"};
  const fs = skin.size * 0.36;
  return (
    <AbsoluteFill>
      <StyleBackdrop style={s} />
      <div style={{position: "absolute", left: 90, right: 90, top: 760, fontFamily: FONT.sans, color: s.palette.text, textAlign: "center"}}>
        <div style={{fontSize: 40, fontWeight: 800, letterSpacing: 4, color: s.palette.accentSoft}}>{s.id.toUpperCase()}</div>
        <div style={{fontSize: 150, fontWeight: 900, lineHeight: 1, color: s.palette.accent, marginTop: 24}}>00</div>
        <div style={{fontSize: 72, fontWeight: 900, marginTop: 24}}>{s.label}</div>
      </div>
      <div style={{position: "absolute", left: 60, right: 60, bottom: 180, fontFamily: FONT.sans, fontWeight: skin.weight, fontSize: fs, lineHeight: 1, color: s.palette.text, textAlign: "center", textTransform: skin.uppercase ? "uppercase" : "none", WebkitTextStroke: `${skin.strokeWidth}px ${skin.strokeColor}`, paintOrder: "stroke fill", textShadow: skin.shadow, whiteSpace: "nowrap"}}>
        <span style={{display: "inline-block", WebkitTextStroke: `${skin.strokeWidth}px ${skin.strokeColor}`, paintOrder: "stroke fill", textShadow: skin.shadow}}>{"THE SKY LOVES THE RAIN"}</span>
      </div>
    </AbsoluteFill>
  );
};

export const Styles: React.FC = () => (
  <AbsoluteFill>
    {STYLE_IDS.map((id, i) => (
      <Sequence key={id} from={i * SLOT} durationInFrames={SLOT} name={id}>
        <Card id={id} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
