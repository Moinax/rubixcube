import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FACE_COLORS, inLayer, moveAxis, quarterTurns, stickerAt, type Face, type Vec } from "./cube";

// BoxGeometry material order: +x, -x, +y, -y, +z, -z.
const SIDES: Vec[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
const GEOMETRY = new RoundedBoxGeometry(0.96, 0.96, 0.96, 4, 0.14);
const PLASTIC = new THREE.MeshStandardMaterial({ color: "#1a1b20", roughness: 0.6 });
const OUTLINE = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06, 1.06, 1.06));
const OUTLINE_MATERIAL = new THREE.LineBasicMaterial({ color: "#f0abfc" });
const MATERIALS = new Map<string, THREE.Material>();
const material = (color: string) => {
  if (!MATERIALS.has(color))
    MATERIALS.set(color, new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.6 }));
  return MATERIALS.get(color)!;
};

const PAUSE = 500;
const HOLD = 1100;

type Props = { state: string; move?: string; highlight?: Vec; autoRotate?: boolean };

/** Renders `state`; when `move` is set, plays it on a loop from `state`. `highlight` outlines one cubie. */
export default function CubeView({ state, move, highlight, autoRotate = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ root: THREE.Group; controls: OrbitControls; onFrame?: (t: number) => void }>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.append(renderer.domElement);
    const world = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    world.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(4.6, 4, 6.2);
    const controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, { enableDamping: true, enablePan: false, minDistance: 6, maxDistance: 14 });
    const root = new THREE.Group();
    world.add(root);
    scene.current = { root, controls };

    const resize = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    renderer.setAnimationLoop((t) => {
      controls.update();
      scene.current?.onFrame?.(t);
      renderer.render(world, camera);
    });
    return () => {
      resize.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      pmrem.dispose();
      world.environment?.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // browsers cap live WebGL contexts, and screens remount this view
      renderer.domElement.remove();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current!.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const ctx = scene.current!;
    const axis = move ? moveAxis(move) : null;
    const layer = new THREE.Group();
    ctx.root.clear();
    ctx.root.add(layer);
    for (const x of [-1, 0, 1])
      for (const y of [-1, 0, 1])
        for (const z of [-1, 0, 1]) {
          const pos: Vec = [x, y, z];
          if (!x && !y && !z) continue;
          const mesh = new THREE.Mesh(
            GEOMETRY,
            SIDES.map((side) => {
              const i = stickerAt(pos, side);
              return i === undefined ? PLASTIC : material(FACE_COLORS[state[i] as Face]);
            }),
          );
          mesh.position.set(x, y, z);
          if (highlight && `${pos}` === `${highlight}`) mesh.add(new THREE.LineSegments(OUTLINE, OUTLINE_MATERIAL));
          (move && inLayer(move, pos) ? layer : ctx.root).add(mesh);
        }

    if (!axis) {
      ctx.onFrame = undefined;
      return;
    }
    const turns = quarterTurns(move!);
    const angle = (-Math.PI / 2) * turns;
    const duration = turns === 2 ? 1300 : 850;
    const vector = new THREE.Vector3(...axis);
    let start: number | undefined;
    ctx.onFrame = (t) => {
      start ??= t;
      const k = Math.min(1, Math.max(0, (((t - start) % (PAUSE + duration + HOLD)) - PAUSE) / duration));
      layer.quaternion.setFromAxisAngle(vector, angle * k * k * (3 - 2 * k));
    };
  }, [state, move, `${highlight}`]);

  return <div ref={host} className="h-full w-full touch-none" />;
}
