import React from "react";
import {AbsoluteFill, Sequence} from "remotion";
import {STYLE_IDS, STYLES, StyleBackdrop} from "../../shared/style";
import {FONT} from "../../shared/theme";

/** One card per style, 4 s each: its backdrop, a headline in its type and its accent. The look-up sheet for docs/styles/. */
const SLOT = 120;
export const STYLES_FRAMES = SLOT * STYLE_IDS.length;

const Card: React.FC<{id: string}> = ({id}) => {
  const s = STYLES[id];
  return (
    <AbsoluteFill>
      <StyleBackdrop style={s} />
      <div style={{position: "absolute", left: 80, right: 80, top: 760, fontFamily: FONT.sans, color: s.palette.text, textAlign: "center"}}>
        <div style={{fontSize: 40, fontWeight: 800, letterSpacing: 4, color: s.palette.accentSoft}}>{s.id.toUpperCase()}</div>
        <div style={{fontSize: 150, fontWeight: 900, lineHeight: 1, color: s.palette.accent, marginTop: 24}}>00</div>
        <div style={{fontSize: 72, fontWeight: 900, marginTop: 24}}>{s.label}</div>
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
