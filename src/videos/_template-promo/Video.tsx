import React from "react";
import {PromoTemplate} from "../../shared/frame/PromoTemplate";
import {scenes} from "./scenes";
import {FPS, PROMO} from "./timing";
import meta from "./video.json";

/** The promo: shared frame + this video's scenes, in the style of promo.json or video.json (§6, docs/styles/). `safe` draws the safe zones (stills only). */
export const Video: React.FC<{safe: boolean}> = ({safe}) => (
  <PromoTemplate promo={PROMO} fps={FPS} scenes={scenes} style={PROMO.style ?? (meta as {style?: string}).style} safe={safe} />
);
