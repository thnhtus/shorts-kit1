import React from "react";
import {ShortsTemplate} from "../../shared/frame/ShortsTemplate";
import narration from "./narration.json";
import {scenes} from "./scenes";
import {FPS, OUTRO_HOLD, VOICE} from "./timing";

/** The video: shared frame + this video's scenes, in the style named in narration.json (§6, docs/styles/). `safe` draws the safe zones (stills only). */
export const Video: React.FC<{safe: boolean}> = ({safe}) => (
  <ShortsTemplate voice={VOICE} fps={FPS} outroHold={OUTRO_HOLD} scenes={scenes} style={(narration as {style?: string}).style} safe={safe} />
);
