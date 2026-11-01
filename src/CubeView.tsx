import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
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
// Outlines in screen pixels: WebGL draws its own lines 1 px wide, too thin to spot.
const edges = (size: number) =>
  new LineSegmentsGeometry().setPositions(new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)).attributes.position.array as Float32Array);
const OUTLINE = edges(1.08);
const PIECE_LINE = new LineMaterial({ color: "#e879f9", linewidth: 4 });
const TARGET = edges(1.12);
const PLACE_LINE = new LineMaterial({ color: "#34d399", linewidth: 4 });
const GLASS_BOX = new THREE.BoxGeometry(1.1, 1.1, 1.1);
const GLASS = new THREE.MeshBasicMaterial({ color: "#34d399", transparent: true, opacity: 0.35, depthWrite: false });
// Where the fingers rest in the home grip, on the cube held yellow up: the thumbs low on the front face,
// the index fingers on the top's back corners.
const FINGER = new THREE.CircleGeometry(0.2, 32);
export const THUMB_COLOR = "#e879f9";
export const INDEX_COLOR = "#34d399";
const [THUMB, INDEX] = [THUMB_COLOR, INDEX_COLOR].map((color) => new THREE.MeshBasicMaterial({ color }));
const GRIP: [pos: Vec, normal: Vec, finger: THREE.Material][] = [
  [[-1, -1, 1], [0, 0, 1], THUMB],
  [[1, -1, 1], [0, 0, 1], THUMB],
  [[-1, 1, -1], [0, 1, 0], INDEX],
  [[1, 1, -1], [0, 1, 0], INDEX],
];
const MATERIALS = new Map<string, THREE.MeshPhysicalMaterial>();
const material = (color: string) => {
  if (!MATERIALS.has(color)) MATERIALS.set(color, new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.6 }));
  return MATERIALS.get(color)!;
};

const CAMERA: Vec = [4.6, 4, 6.2];

const ease = (k: number) => k * k * (3 - 2 * k);

type Props = {
  state: string;
  moves?: string[];
  onEnd?: () => void;
  piece?: string;
  place?: string;
  pair?: string;
  pairPlace?: string;
  replay?: number;
  grip?: boolean;
  autoRotate?: boolean;
};

/**
 * Renders `state`; when `moves` are set, plays them one after the other from `state`, then calls `onEnd`.
 * `piece` (its colors) is outlined, and `place` (the colors of the centers around it) is a green glass box;
 * so are `pair`, a second piece that goes with it (an F2L edge), and `pairPlace`. A new `replay` count
 * plays the same moves again. `grip` marks where the fingers rest in the home grip.
 */
export default function CubeView({ state, moves, onEnd, piece, place, pair, pairPlace, replay, grip, autoRotate = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ root: THREE.Group; controls: OrbitControls; onFrame?: (t: number) => void }>(null);
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
    renderer.setAnimationLoop((t) => {
      controls.update();
      scene.current?.onFrame?.(t);
      // The outlines are shared: each view sizes them to its own canvas before drawing them.
      renderer.getSize(PIECE_LINE.resolution);
      PLACE_LINE.resolution.copy(PIECE_LINE.resolution);
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

  // The pieces to follow, each with the place it goes to.
  const tracked = ([[piece, place], [pair, pairPlace]] as [string | undefined, string | undefined][]).filter((t): t is [string, string | undefined] => !!t[0]);
  useEffect(() => {
    const ctx = scene.current!;
    /** The cube `s`, with the cubies that `move` turns in the returned layer. */
    const build = (s: string, move?: string) => {
      const ats = tracked.map(([p]) => `${findPiece(s, p)}`);
      const layer = new THREE.Group();
      ctx.root.clear();
      ctx.root.add(layer);
      for (const x of [-1, 0, 1])
        for (const y of [-1, 0, 1])
          for (const z of [-1, 0, 1]) {
            const pos: Vec = [x, y, z];
            if (!x && !y && !z) continue;
            const mine = ats.includes(`${pos}`);
            const mesh = new THREE.Mesh(
              GEOMETRY,
              SIDES.map((side) => {
                const i = stickerAt(pos, side);
                return i === undefined ? PLASTIC : material(FACE_COLORS[s[i] as Face]);
              }),
            );
            mesh.position.set(x, y, z);
            if (mine) mesh.add(new LineSegments2(OUTLINE, PIECE_LINE));
            (move && inLayer(move, pos) ? layer : ctx.root).add(mesh);
          }
      // The fingers stay where they rest while a face turns under them.
      if (grip)
        for (const [pos, normal, finger] of GRIP) {
          const dot = new THREE.Mesh(FINGER, finger);
          dot.position.set(...pos).addScaledVector(new THREE.Vector3(...normal), 0.52);
          dot.lookAt(dot.position.clone().add(new THREE.Vector3(...normal)));
          ctx.root.add(dot);
        }
      // A place stays put while a face turns through it, and only follows the whole cube.
      for (const [, slot] of tracked) {
        if (!slot) continue;
        const glass = new THREE.Group().add(new THREE.Mesh(GLASS_BOX, GLASS), new LineSegments2(TARGET, PLACE_LINE));
        glass.position.set(...homeOf(s, slot));
        (move && isRotation(move) ? layer : ctx.root).add(glass);
      }
      return layer;
    };

    const show = (s: string, i: number) => {
      const move = moves?.[i];
      const layer = build(s, move);
      if (!move) {
        ctx.onFrame = undefined;
        return;
      }
      const turns = quarterTurns(move);
      const angle = (-Math.PI / 2) * turns;
      const duration = turns === 2 ? 1300 : 850;
      const vector = new THREE.Vector3(...moveAxis(move));
      let start: number | undefined;
      ctx.onFrame = (t) => {
        start ??= t;
        const k = Math.min(1, (t - start) / duration);
        layer.quaternion.setFromAxisAngle(vector, angle * ease(k));
        if (k < 1) return;
        if (i + 1 < moves!.length) return show(applyMove(s, move), i + 1);
        ctx.onFrame = undefined;
        ended.current?.();
      };
    };

    show(state, 0);
  }, [state, moves?.join(" "), piece, place, pair, pairPlace, replay, grip]);

  return <div ref={host} className="relative h-full w-full touch-none" />;
}
