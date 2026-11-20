/**
 * Frame-pure three.js on a <canvas>, the way the source skills draw: build the
 * scene once, then call `render(t)` for the current frame. Remotion renders
 * frames out of order, so nothing here may depend on wall-clock time; t comes
 * from useCurrentFrame().
 */
import {useLayoutEffect, useRef} from "react";
import {useCurrentFrame} from "remotion";
import {FPS} from "../shared/theme";

export type CanvasScene = {render: (t: number) => void};

/** Create the scene on first layout, then `render(frame / FPS)` on every frame. */
export const useCanvasScene = (create: (canvas: HTMLCanvasElement) => CanvasScene) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CanvasScene | null>(null);
  const createRef = useRef(create);
  createRef.current = create;
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!sceneRef.current) sceneRef.current = createRef.current(canvas);
    sceneRef.current.render(frame / FPS);
  }, [frame]);
  return canvasRef;
};
