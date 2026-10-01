# Landing-page robot

The `#topology` anchor now introduces the native model with the original robot mascot instead of the brain image, simulated synapses and fictional cortical service telemetry. Existing section links still work; their labels now say “Meet the Robot”. The authenticated dependency-map feature is unchanged.

## Asset provenance

Both public assets are **byte-for-byte extractions** of `ai-kitchen-just-a-bit-fun.zip`, an archive that held exactly these two files. The archive itself is no longer tracked in this repository, so the SHA-256 values below are the provenance record. No generated replacement, model conversion, geometry decimation or texture downsampling is used.

| File | SHA-256 |
|---|---|
| `public/robot/source/Animation_Walking_withSkin.fbx` | `62fc973f9c81841653f1f92deb74dbb66eb482183415695b99f9cf248ed1d361` |
| `public/robot/textures/texture_0.png` | `05a7e6877ea0533fd0a8e653c6bed6a98ee867d61d7745d4ca17cd5c96d1fadd` |

The archive contained no creator/license document. No new ownership or licensing claim is made; retain the creator's required attribution/license if supplied separately.

The model has one skinned mesh (`char1`, 9,998 triangles), a 2048 × 2048 texture, a `Head` bone beneath `neck`, and one walking clip. Three.js's FBXLoader warns about vertices with more than four skin influences and retains the four strongest weights for WebGL skinning. The source file itself is unmodified.

## Rendering and interaction

- `topology.tsx` defers the dynamically imported scene until it approaches the viewport.
- `robot-scene.tsx` loads the FBX directly with the existing Three.js dependency. Embedded/export-workstation texture references resolve to the original local PNG. There is no remote model, texture or lighting dependency.
- The imported materials and UVs are retained. Hemisphere/key/fill/rim lighting, tone mapping, anisotropic texture filtering, antialiasing and a floor shadow provide a restrained studio presentation. Pixel ratio is capped at 2.
- The original walking animation is deliberately not played: its animation tracks would overwrite the gaze pose. The body remains in the imported pose and the actual head bone turns.
- Window-level pointer events track the whole page, including outside the canvas. Touch taps/moves also set the target. Head rotation is applied relative to the original bone orientation using world-space quaternion offsets and eased with frame-rate-independent interpolation. Yaw/pitch limits avoid extreme deformation.
- Pointer exit/window blur recenters the head. Scrolling changes the screen-relative target. Offscreen/hidden-tab rendering is suspended.
- Pause and OS reduced-motion preferences produce a still pose. Resuming restores tracking. Asset or WebGL failures show an accessible message and retry button instead of an empty canvas.
- Resize/visibility/pointer listeners, RAF callbacks, embedded blob URLs, geometries, materials, textures, skeleton buffers and the renderer are cleaned up on unmount.

## Native-model copy

Claims on the landing page are grounded in `src/server/ai/arch-model/train.ts`, the native engine and `ARCH-MODEL.md`: Naive Bayes classification, TF-IDF retrieval, rules/templates, per-organization training, CPU inference, optional network integrations and human review. The mascot is explicitly decorative, not an intelligence visualization.

Removed the unsupported universal `87%` RCA-accuracy and `<180ms` ingestion claims. Workflow samples are labeled illustrative; percentage-confidence marketing decorations were removed. No model behavior, backend authorization, training or inference implementation was changed.

## Verification

```sh
npm run db:generate
npm run typecheck
npm test -- tests/robot-gaze.test.ts tests/arch-model.test.ts
npm run build
npm run dev
```

Browser checks performed in Chromium:

1. Desktop: original FBX and PNG return HTTP 200; head turns in all directions, including with the cursor outside the scene.
2. Pause produces a stable render; resume restores tracking.
3. 390px touch viewport: original model renders, touch targeting works, no horizontal overflow.
4. Reduced motion: static model; tracking control disabled.
5. Block the PNG request: readable error; unblock and retry successfully.
6. Disable WebGL: readable fallback; model facts remain available.
7. Native-model detail disclosures open via their controls; no page runtime exceptions in the normal desktop/mobile checks.

The production build passes with existing Turbopack dynamic-filesystem tracing warnings in the server agent tooling (not the mascot). A fresh, unseeded local database has no `/status/arch` page; the existing status chip correctly falls back to its neutral state.
