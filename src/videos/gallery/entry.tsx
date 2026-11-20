import React from "react";
import {Composition, registerRoot} from "remotion";
import {FPS, H, W} from "../../shared/theme";
import {GALLERY_FRAMES, Gallery} from "./Gallery";
import {STYLES_FRAMES, Styles} from "./Styles";

const Root: React.FC = () => (
  <>
    <Composition id="Video" component={Gallery} width={W} height={H} fps={FPS} durationInFrames={GALLERY_FRAMES} defaultProps={{labels: true}} />
    <Composition id="Styles" component={Styles} width={W} height={H} fps={FPS} durationInFrames={STYLES_FRAMES} />
  </>
);

registerRoot(Root);
