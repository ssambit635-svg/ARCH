'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { gazeBlend, robotGaze } from './robot-gaze';

const MODEL_URL = '/robot/source/Animation_Walking_withSkin.fbx';
const TEXTURE_URL = '/robot/textures/texture_0.png';

/** The uploaded FBX, not a substitute mesh. Walking tracks are intentionally not played:
 * they would overwrite the Head bone each frame and fight the pointer-driven gaze. */
export function RobotScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pauseRef = useRef(false);
  pauseRef.current = paused || reduced;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let visible = false;
    let frame = 0;
    let lastTime = 0;
    let loaded = false;
    let failed = false;
    let model: THREE.Group | null = null;
    let head: THREE.Object3D | undefined;
    let renderer: THREE.WebGLRenderer;
    setStatus('loading');
    setProgress(0);

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setStatus('error');
      return;
    }
    // Keep the 2K atlas legible on standard-density screens without unbounded Retina GPU cost.
    renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
    camera.position.set(0, 0.25, 5.8);
    camera.lookAt(0, 0, 0);
    // The old 10+ intensity light rig blew out the pale blue atlas and hid its panel lines.
    // A restrained key/fill/rim keeps the original painted details visible on white armor.
    scene.add(new THREE.HemisphereLight(0xe2eeff, 0x353e53, 0.9));
    const key = new THREE.DirectionalLight(0xfff3e6, 2.2);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -3;
    key.shadow.camera.right = key.shadow.camera.top = 3;
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.0003;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xa7caff, 0.7);
    fill.position.set(-4, 2, 1);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xb1cdff, 1.2);
    rim.position.set(1, 3, -3);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.24 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.54;
    floor.receiveShadow = true;
    scene.add(floor);


    const textures = new Set<THREE.Texture>();
    const disposeObject = (object: THREE.Object3D) => {
      object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) (mesh as THREE.SkinnedMesh).skeleton.dispose();
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
          material.dispose();
        }
      });
      textures.forEach((texture) => texture.dispose());
    };
    const fail = () => {
      if (disposed) return;
      failed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      setStatus('error');
    };
    const contextLost = (event: Event) => { event.preventDefault(); fail(); };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);

    const pointer = { x: 0, y: 0, active: false };
    const onPointer = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    };
    const resetPointer = () => { pointer.active = false; };
    // Window-level tracking is deliberate: the robot watches the entire page, not just its canvas.
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('blur', resetPointer);
    document.documentElement.addEventListener('pointerleave', resetPointer);

    const restLocal = new THREE.Quaternion();
    const restWorld = new THREE.Quaternion();
    const parentInverse = new THREE.Quaternion();
    const desired = new THREE.Quaternion();
    const offset = new THREE.Quaternion();
    const rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    const face = new THREE.Vector3();

    const render = (time: number) => {
      frame = 0;
      if (disposed || failed || !loaded || !visible || document.hidden) return;
      const delta = lastTime ? (time - lastTime) / 1000 : 1 / 60;
      lastTime = time;
      let settling = false;
      if (head?.parent) {
        if (pointer.active && !pauseRef.current) {
          const rect = renderer.domElement.getBoundingClientRect();
          head.getWorldPosition(face);
          // The rig pivot sits under its oversized head. Aim relative to the visible face.
          face.y += 0.5;
          face.project(camera);
          const x = rect.left + (face.x + 1) * rect.width / 2;
          const y = rect.top + (1 - face.y) * rect.height / 2;
          const gaze = robotGaze(pointer.x - x, pointer.y - y, rect.width, rect.height);
          rotation.set(gaze.pitch, gaze.yaw, 0, 'YXZ');
          offset.setFromEuler(rotation);
          head.parent.getWorldQuaternion(parentInverse).invert();
          desired.copy(parentInverse).multiply(offset).multiply(restWorld);
        } else {
          desired.copy(restLocal);
        }
        // Apply a world-axis offset relative to the FBX's bind pose, not guessed bone Euler axes.
        head.quaternion.slerp(desired, pauseRef.current ? 1 : gazeBlend(delta));
        settling = head.quaternion.angleTo(desired) > 0.0001;
      }
      renderer.render(scene, camera);
      // Reduced motion and Pause leave a still render rather than burning an idle RAF loop.
      if (!pauseRef.current || settling) frame = requestAnimationFrame(render);
    };
    const wake = () => {
      if (!frame && loaded && visible && !document.hidden && !failed) {
        lastTime = 0;
        frame = requestAnimationFrame(render);
      }
    };
    const resize = new ResizeObserver(() => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      // Keep feet and head in frame even on narrow phones.
      camera.position.z = Math.max(5.8, 3.5 / camera.aspect);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      wake();
    });
    resize.observe(host);
    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (!visible) { cancelAnimationFrame(frame); frame = 0; } else wake();
    });
    observer.observe(host);
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else wake();
    };
    document.addEventListener('visibilitychange', onVisibility);
    host.addEventListener('robot-motion-change', wake);

    const manager = new THREE.LoadingManager();
    const embeddedUrls = new Set<string>();
    const releaseEmbeddedUrls = () => {
      embeddedUrls.forEach((url) => URL.revokeObjectURL(url));
      embeddedUrls.clear();
    };
    // FBX export includes workstation paths/embedded images. Always resolve to its supplied,
    // full-resolution texture; never request the exporter's /tmp/... paths or an external CDN.
    manager.setURLModifier((url) => {
      if (url.startsWith('blob:')) {
        if (disposed) URL.revokeObjectURL(url); else embeddedUrls.add(url);
        return TEXTURE_URL;
      }
      return /texture_0\.png/i.test(url) ? TEXTURE_URL : url;
    });
    manager.onError = () => { releaseEmbeddedUrls(); fail(); };
    manager.onLoad = () => {
      releaseEmbeddedUrls();
      if (disposed || failed || !model) return;
      loaded = true;
      setStatus('ready');
      wake();
    };
    new FBXLoader(manager).load(MODEL_URL, (object) => {
      if (disposed) { disposeObject(object); return; }
      model = object;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      // Fill more of the stage: fine face/torso details were tiny at the old scale.
      const scale = 3.05 / size.y;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          const phong = material as THREE.MeshPhongMaterial;
          if (phong.map) {
            phong.map.colorSpace = THREE.SRGBColorSpace;
            phong.map.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
          }
          // Preserve the supplied UVs and diffuse map; subtle highlights, not a glossy
          // white glare across the face, eyes and armor's painted seams.
          if (phong.isMeshPhongMaterial) { phong.shininess = 48; phong.specular.set(0x192431); }
        }
      });
      scene.add(model);
      scene.updateMatrixWorld(true);
      head = model.getObjectByName('Head');
      if (!head) { fail(); return; }
      restLocal.copy(head.quaternion);
      head.getWorldQuaternion(restWorld);
    }, (event) => {
      if (!disposed && event.total) setProgress(Math.round(event.loaded / event.total * 100));
    }, fail);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('blur', resetPointer);
      document.documentElement.removeEventListener('pointerleave', resetPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      host.removeEventListener('robot-motion-change', wake);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      disposeObject(scene);
      key.shadow.dispose();
      releaseEmbeddedUrls();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [attempt]);

  useEffect(() => {
    hostRef.current?.dispatchEvent(new Event('robot-motion-change'));
  }, [paused, reduced]);

  return (
    <div className="relative">
      <div className="robot-stage relative" role="img" aria-label="The original textured robot mascot. Its head follows your pointer across the page when motion is enabled.">
        <div ref={hostRef} className={`absolute inset-0 transition-opacity duration-500 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`} />
        {status === 'loading' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" role="status">
          <span className="mk-robot-loader" aria-hidden />
          <span className="mk-robot-status">{progress === 100 ? 'Preparing textures…' : `Loading the original robot${progress ? ` · ${progress}%` : '…'}`}</span>
        </div>}
        {status === 'error' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="mk-robot-status" role="status">The 3D robot couldn’t load.</p>
          <p className="mk-footnote max-w-xs">Check your connection and WebGL support. The model information is still available beside this view.</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mk-robot-retry">Try again</button>
        </div>}
      </div>
      <div className="mk-robot-controls">
        <span aria-live="polite">{reduced ? 'Reduced motion · a still hello' : paused ? 'Taking a little break' : 'Move your cursor anywhere · tap on touch'}</span>
        <button type="button" disabled={reduced || status !== 'ready'} aria-pressed={paused || reduced} onClick={() => setPaused((p) => !p)} className="mk-robot-pause">
          {paused ? 'Resume tracking' : 'Pause tracking'}
        </button>
      </div>
    </div>
  );
}
