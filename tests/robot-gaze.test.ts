import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { Box3, Mesh, Texture, TextureLoader, Vector3 } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { gazeBlend, robotGaze } from '../src/components/marketing/robot-gaze';

describe('mascot gaze', () => {
  it('looks straight ahead at its face center', () => {
    expect(robotGaze(0, 0, 600, 500)).toEqual({ yaw: 0, pitch: 0 });
  });
  it('turns toward all four screen directions', () => {
    expect(robotGaze(100, 0, 600, 500).yaw).toBeGreaterThan(0);
    expect(robotGaze(-100, 0, 600, 500).yaw).toBeLessThan(0);
    expect(robotGaze(0, 100, 600, 500).pitch).toBeGreaterThan(0);
    expect(robotGaze(0, -100, 600, 500).pitch).toBeLessThan(0);
  });
  it('clamps pointers far outside the canvas to safe head angles', () => {
    expect(robotGaze(1e6, 1e6, 600, 500)).toEqual({ yaw: 0.55, pitch: 0.24 });
    expect(robotGaze(-1e6, -1e6, 600, 500)).toEqual({ yaw: -0.55, pitch: -0.24 });
  });
  it('handles a temporarily zero-sized stage without NaNs', () => {
    const angles = robotGaze(0, 0, 0, 0);
    expect(Number.isFinite(angles.yaw) && Number.isFinite(angles.pitch)).toBe(true);
  });
  it('eases consistently across refresh rates', () => {
    expect(1 - (1 - gazeBlend(1 / 120)) ** 2).toBeCloseTo(gazeBlend(1 / 60));
    expect(gazeBlend(10)).toBe(gazeBlend(0.05));
    expect(gazeBlend(-1)).toBe(0);
  });
});

describe('original robot asset contract', () => {
  it('loads the supplied skinned FBX with a Head bone, textured mesh and original walking clip', () => {
    // No browser image APIs needed to verify the FBX geometry/rig in node.
    const imageLoader = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(() => new Texture());
    try {
      const buffer = fs.readFileSync('public/robot/source/Animation_Walking_withSkin.fbx');
      const object = new FBXLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer, '');
      expect(object.getObjectByName('Head')?.type).toBe('Bone');
      expect(object.getObjectByName('neck')?.type).toBe('Bone');
      const mesh = object.getObjectByName('char1') as Mesh;
      expect(mesh.type).toBe('SkinnedMesh');
      expect(mesh.geometry.attributes.position?.count).toBe(29994);
      expect(object.animations).toHaveLength(1);
      expect(new Box3().setFromObject(object).getSize(new Vector3()).y).toBeGreaterThan(170);
      const texture = fs.readFileSync('public/robot/textures/texture_0.png');
      expect(texture.subarray(1, 4).toString()).toBe('PNG');
      expect([texture.readUInt32BE(16), texture.readUInt32BE(20)]).toEqual([2048, 2048]);
    } finally {
      imageLoader.mockRestore();
    }
  });
});
