import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { findPiece, homeOf } from "./beginner";
import { applyMove, FACE_COLORS, inLayer, isRotation, moveAxis, quarterTurns, stickerAt, type Face, type Vec } from "./cube";

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
const OUTLINE_MATERIAL = new THREE.LineBasicMaterial({ color: "#f0abfc", transparent: true });
const TARGET = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.12, 1.12, 1.12));
const TARGET_MATERIAL = new THREE.LineBasicMaterial({ color: "#34d399", transparent: true });
const DIM = new THREE.MeshStandardMaterial({ color: "#3a3d45", roughness: 0.5 });
const MATERIALS = new Map<string, THREE.Material>();
const material = (color: string) => {
  if (!MATERIALS.has(color))
    MATERIALS.set(color, new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.6 }));
  return MATERIALS.get(color)!;
};

const CAMERA: Vec = [4.6, 4, 6.2];
/** The camera's turn around the vertical axis to look from the side `x` (±1) and the side `z` (±1), always from above. */
const azimuth = ([x, z]: number[]) => Math.atan2(CAMERA[0] * x, CAMERA[2] * z);

/** The view, from above, that shows the most stickers of the cubies at `places`: the usual one (right and front) unless they hide. */
function bestView(places: Vec[]): [number, number] {
  const seen = ([x, z]: number[]) => places.reduce((n, p) => n + +(p[0] === x) + +(p[1] === 1) + +(p[2] === z), 0);
  return ([[1, 1], [-1, 1], [1, -1], [-1, -1]] as [number, number][]).reduce((best, v) => (seen(v) > seen(best) ? v : best));
}

type Props = {
  state: string;
  moves?: string[];
  preview?: boolean;
  onEnd?: () => void;
  piece?: string;
  place?: boolean;
  frame?: boolean;
  autoRotate?: boolean;
};

/**
 * Renders `state`; when `moves` are set, plays them one after the other from `state`, then calls `onEnd`.
 * `piece` (its colors) is outlined, and with `place` the place it goes to, in green. A `preview` plays
 * faster with every other piece greyed, and holds its end a moment. `frame` turns the camera toward
 * the piece and its place when they hide, and makes their outlines pulse; without it, the camera
 * comes back in front, where the moves are played from.
 */
export default function CubeView({ state, moves, preview, onEnd, piece, place, frame, autoRotate = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ root: THREE.Group; controls: OrbitControls; onFrame?: (t: number) => void; aim?: number; pulse?: boolean }>(null);
  const ended = useRef(onEnd);
  ended.current = onEnd;

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    // Out of the flow: the canvas follows its box and never widens the layout around it.
    renderer.domElement.className = "absolute inset-0";
    el.append(renderer.domElement);
    const world = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    world.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(...CAMERA);
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
    const turn = new THREE.Spherical();
    renderer.setAnimationLoop((t) => {
      const ctx = scene.current;
      if (ctx?.aim !== undefined) {
        turn.setFromVector3(camera.position);
        const d = Math.atan2(Math.sin(ctx.aim - turn.theta), Math.cos(ctx.aim - turn.theta));
        turn.theta += Math.abs(d) < 0.003 ? d : d * 0.08;
        if (Math.abs(d) < 0.003) ctx.aim = undefined;
        camera.position.setFromSpherical(turn);
      }
      OUTLINE_MATERIAL.opacity = TARGET_MATERIAL.opacity = ctx?.pulse ? 0.7 + 0.3 * Math.cos(t / 180) : 1;
      controls.update();
      ctx?.onFrame?.(t);
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
    const show = (s: string, i: number) => {
      const move = moves?.[i];
      const at = piece && `${findPiece(s, piece)}`;
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
                return i === undefined ? PLASTIC : preview && `${pos}` !== at ? DIM : material(FACE_COLORS[s[i] as Face]);
              }),
            );
            mesh.position.set(x, y, z);
            if (`${pos}` === at) mesh.add(new THREE.LineSegments(OUTLINE, OUTLINE_MATERIAL));
            (move && inLayer(move, pos) ? layer : ctx.root).add(mesh);
          }
      // The place stays put while a face turns through it, and only follows the whole cube.
      if (piece && place) {
        const outline = new THREE.LineSegments(TARGET, TARGET_MATERIAL);
        outline.position.set(...homeOf(s, piece));
        (move && isRotation(move) ? layer : ctx.root).add(outline);
      }

      if (!move) {
        ctx.onFrame = undefined;
        return;
      }
      const turns = quarterTurns(move);
      const angle = (-Math.PI / 2) * turns;
      const duration = (turns === 2 ? 1300 : 850) * (preview ? 0.5 : 1);
      const hold = preview ? 800 : 0; // a preview shows where it starts, once the camera is back in front, then where it ends
      const vector = new THREE.Vector3(...moveAxis(move));
      let start: number | undefined;
      ctx.onFrame = (t) => {
        start ??= t + (i ? 0 : hold);
        const k = Math.min(1, Math.max(0, (t - start) / duration));
        layer.quaternion.setFromAxisAngle(vector, angle * k * k * (3 - 2 * k));
        if (k < 1) return;
        if (i + 1 < moves!.length) return show(applyMove(s, move), i + 1);
        ctx.onFrame = (now) => {
          if (now - t < hold * 2) return;
          ctx.onFrame = undefined;
          ended.current?.();
        };
      };
    };
    show(state, 0);
  }, [state, moves?.join(" "), preview, piece, place]);

  // Only a change of view turns the camera, so it stays wherever the user dragged it in between.
  const view = frame && piece ? bestView([findPiece(state, piece), ...(place ? [homeOf(state, piece)] : [])]) : [1, 1];
  useEffect(() => {
    scene.current!.aim = azimuth(view);
  }, [`${view}`]);
  useEffect(() => {
    scene.current!.pulse = frame;
  }, [frame]);

  return <div ref={host} className="relative h-full w-full touch-none" />;
}
