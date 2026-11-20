import React from "react";
import {Composition, registerRoot} from "remotion";
import {loadFont} from "../shared/font";
import {FPS, H, W} from "../shared/theme";
import {PRESET_LIST, type Spec} from "./index";

loadFont();

/**
 * One composition per preset, id = preset id. The spec arrives as input props
 * (`bun run anim <spec.json>` passes it with --props); defaults fill the gaps
 * and the duration follows the spec.
 */
const Root: React.FC = () => (
  <>
    {PRESET_LIST.map((p) => (
      <Composition
        key={p.id}
        id={p.id}
        component={p.Component as React.FC<{spec: Spec}>}
        defaultProps={{spec: p.defaults}}
        durationInFrames={Math.ceil(p.seconds(p.defaults) * FPS)}
        fps={FPS}
        width={W}
        height={H}
        calculateMetadata={({props}) => {
          const spec = {...p.defaults, ...props.spec};
          p.check?.(spec);
          const hold = typeof spec.hold === "number" ? Math.max(0, spec.hold) : 0;
          return {props: {spec}, durationInFrames: Math.ceil((p.seconds(spec) + hold) * FPS)};
        }}
      />
    ))}
  </>
);

registerRoot(Root);
