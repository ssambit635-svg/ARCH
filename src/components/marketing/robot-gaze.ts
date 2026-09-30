/** Screen-space gaze with gentle anatomical limits; also works outside the canvas. */
export function robotGaze(dx: number, dy: number, width: number, height: number) {
  return {
    yaw: Math.max(-0.55, Math.min(0.55, Math.atan2(dx, Math.max(width * 0.65, 1)))),
    pitch: Math.max(-0.24, Math.min(0.24, Math.atan2(dy, Math.max(height * 0.85, 1)))),
  };
}

/** Frame-rate-independent easing, capped after a background-tab pause. */
export function gazeBlend(deltaSeconds: number) {
  return 1 - Math.exp(-10 * Math.max(0, Math.min(deltaSeconds, 0.05)));
}
