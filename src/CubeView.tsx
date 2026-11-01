import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { findPiece, homeOf } from "./beginner";
import { applyMove, center, FACE_COLORS, inLayer, isRotation, moveAxis, NORMALS, quarterTurns, stickerAt, type Face, type Vec } from "./cube";

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
const PIECE_LINE = new LineMaterial({ color: "#e879f9", linewidth: 4, transparent: true });
const TARGET = edges(1.12);
const PLACE_LINE = new LineMaterial({ color: "#34d399", linewidth: 4, transparent: true });
const GLASS_BOX = new THREE.BoxGeometry(1.1, 1.1, 1.1);
const GLASS_OPACITY = 0.35;
const GLASS = new THREE.MeshBasicMaterial({ color: "#34d399", transparent: true, opacity: GLASS_OPACITY, depthWrite: false });
// Every sticker but the piece's dims together in the spotlight: one material per color, recolored each frame.
const SHADOW = new THREE.Color("#25272d");
const sticker = (color: string, opacity = 1) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.6, transparent: opacity < 1, opacity });
const MATERIALS = new Map<string, THREE.MeshPhysicalMaterial>();
const BRIGHT = new Map<string, THREE.MeshPhysicalMaterial>();
const GHOST = new Map<string, THREE.MeshPhysicalMaterial>(); // the flying copy's, faded in and out
const cached = (map: Map<string, THREE.MeshPhysicalMaterial>, color: string) => {
  if (!map.has(color)) map.set(color, sticker(color, map === GHOST ? 0 : 1));
  return map.get(color)!;
};

const CAMERA: Vec = [4.6, 4, 6.2];
/** The camera's turn around the vertical axis to look from the side `x` (±1) and the side `z` (±1), always from above. */
const azimuth = ([x, z]: number[]) => Math.atan2(CAMERA[0] * x, CAMERA[2] * z);

/** The view, from above, that shows the most stickers of the cubies at `places`: the usual one (right and front) unless they hide. */
function bestView(places: Vec[]): [number, number] {
  const seen = ([x, z]: number[]) => places.reduce((n, p) => n + +(p[0] === x) + +(p[1] === 1) + +(p[2] === z), 0);
  return ([[1, 1], [-1, 1], [1, -1], [-1, -1]] as [number, number][]).reduce((best, v) => (seen(v) > seen(best) ? v : best));
}

/** Which way each color of the cubie at `pos` faces, as directions in the frame of the cube `frame`. */
function facing(s: string, pos: Vec, frame = s) {
  // `s` may hold the cube turned (x, y, z) from `frame`: the centers say which of its directions is which.
  const inFrame = (n: Vec) => Object.values(NORMALS).find((m) => center(frame, m) === center(s, n))!;
  return new Map(
    SIDES.flatMap((n) => {
      const i = stickerAt(pos, n);
      return i === undefined ? [] : [[s[i], new THREE.Vector3(...inFrame(n))] as const];
    }),
  );
}
/** The turn that takes the piece from how it sits in `s` to how it sits in `end`. */
function landing(s: string, end: string, piece: string) {
  const [a, b] = [facing(s, findPiece(s, piece)), facing(end, findPiece(end, piece), s)];
  const [c1, c2] = [...a.keys()];
  const basis = (m: typeof a) => new THREE.Matrix4().makeBasis(m.get(c1)!, m.get(c2)!, m.get(c1)!.clone().cross(m.get(c2)!));
  return new THREE.Quaternion().setFromRotationMatrix(basis(b).multiply(basis(a).transpose()));
}

const ease = (k: number) => k * k * (3 - 2 * k);

type Props = {
  state: string;
  moves?: string[];
  fly?: string;
  onEnd?: () => void;
  piece?: string;
  place?: string;
  pair?: string;
  pairPlace?: string;
  spot?: boolean;
  replay?: number;
  autoRotate?: boolean;
};

/**
 * Renders `state`; when `moves` are set, plays them one after the other from `state`, then calls `onEnd`.
 * `piece` (its colors) is outlined, and `place` (the colors of the centers around it) is a green glass box;
 * so are `pair`, a second piece that goes with it (an F2L edge), and `pairPlace`.
 * `fly` (the cube the piece's sequence leads to) sends a copy of each piece flying to its place, landing
 * the way the sequence leaves it, then calls `onEnd`. `spot` dims the rest of the cube, makes the outlines
 * pulse and turns the camera toward the piece and its place when they hide; without it, the camera comes
 * back in front, where the moves are played from. A new `replay` count plays the same moves again.
 */
export default function CubeView({ state, moves, fly, onEnd, piece, place, pair, pairPlace, spot, replay, autoRotate = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ root: THREE.Group; controls: OrbitControls; onFrame?: (t: number) => void; aim?: number; reach?: number; spot?: boolean }>(null);
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
    let dim = 0;
    renderer.setAnimationLoop((t) => {
      const ctx = scene.current;
      if (ctx?.aim !== undefined || ctx?.reach !== undefined) {
        turn.setFromVector3(camera.position);
        const d = Math.atan2(Math.sin((ctx.aim ?? turn.theta) - turn.theta), Math.cos((ctx.aim ?? turn.theta) - turn.theta));
        const r = (ctx.reach ?? turn.radius) - turn.radius;
        turn.theta += Math.abs(d) < 0.003 ? d : d * 0.08;
        turn.radius += Math.abs(r) < 0.01 ? r : r * 0.08;
        if (Math.abs(d) < 0.003) ctx.aim = undefined;
        if (Math.abs(r) < 0.01) ctx.reach = undefined;
        camera.position.setFromSpherical(turn);
      }
      const goal = ctx?.spot ? 1 : 0;
      if (dim !== goal) {
        dim = Math.abs(goal - dim) < 0.01 ? goal : dim + (goal - dim) * 0.12;
        for (const [color, m] of MATERIALS) m.color.set(color).lerp(SHADOW, 0.75 * dim);
      }
      const breath = ctx?.spot ? 0.8 + 0.2 * Math.cos(t / 200) : 1;
      PIECE_LINE.opacity = PLACE_LINE.opacity = breath;
      GLASS.opacity = GLASS_OPACITY * breath;
      controls.update();
      ctx?.onFrame?.(t);
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
      for (const [color, m] of MATERIALS) m.color.set(color); // the next view starts undimmed
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
                return i === undefined ? PLASTIC : cached(mine ? BRIGHT : MATERIALS, FACE_COLORS[s[i] as Face]);
              }),
            );
            mesh.position.set(x, y, z);
            if (mine) mesh.add(new LineSegments2(OUTLINE, PIECE_LINE));
            (move && inLayer(move, pos) ? layer : ctx.root).add(mesh);
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

    const flying = tracked.filter((t): t is [string, string] => !!t[1]);
    if (!(fly && flying.length)) return show(state, 0);
    build(state);
    // A copy of each piece rises, flies around the cube (never through it) to its place, turning on the
    // way to how the sequence leaves it, stays a moment, then fades.
    const colorsOf = (at: Vec) => SIDES.map((side) => stickerAt(at, side)).map((i) => (i === undefined ? undefined : FACE_COLORS[state[i] as Face]));
    const still = new THREE.Quaternion();
    const fliers = flying.map(([p, slot]) => {
      const at = findPiece(state, p);
      const colors = colorsOf(at);
      const copy = new THREE.Mesh(GEOMETRY, colors.map((c) => (c ? cached(GHOST, c) : PLASTIC))).add(new LineSegments2(OUTLINE, PIECE_LINE));
      copy.scale.setScalar(1.05); // over the cubie at the place, never inside it
      const group = new THREE.Group().add(copy);
      const [from, to] = [new THREE.Vector3(...at), new THREE.Vector3(...homeOf(state, slot))];
      group.position.copy(from);
      ctx.root.add(group);
      const out = from.clone().normalize();
      return { group, colors, from, to, out, turnTo: landing(state, fly, p), swing: new THREE.Quaternion().setFromUnitVectors(out, to.clone().normalize()) };
    });
    const fade = (o: number) => fliers.forEach(({ colors }) => colors.forEach((c) => c && (cached(GHOST, c).opacity = o)));
    fade(0);
    const part = new THREE.Quaternion();
    const [RISE, FLY, HOLD, OUT] = [500, 1700, 1400, 500];
    let start: number | undefined;
    ctx.onFrame = (t) => {
      start ??= t;
      const e = t - start;
      if (e < RISE) return fade(ease(e / RISE));
      const k = ease(Math.min(1, (e - RISE) / FLY));
      for (const { group, from, to, out, swing, turnTo } of fliers) {
        const reach = THREE.MathUtils.lerp(from.length(), to.length(), k) + 0.9 * Math.sin(Math.PI * k);
        group.position.copy(out).applyQuaternion(part.slerpQuaternions(still, swing, k)).multiplyScalar(reach);
        group.quaternion.slerpQuaternions(still, turnTo, k);
      }
      if (e < RISE + FLY + HOLD) return;
      fade(1 - Math.min(1, (e - RISE - FLY - HOLD) / OUT));
      if (e < RISE + FLY + HOLD + OUT) return;
      ctx.onFrame = undefined;
      fliers.forEach(({ group }) => ctx.root.remove(group));
      ended.current?.();
    };
  }, [state, moves?.join(" "), fly, piece, place, pair, pairPlace, replay]);

  // Only a change of view turns the camera, so it stays wherever the user dragged it in between.
  const view = spot && tracked.length ? bestView(tracked.flatMap(([p, slot]) => [findPiece(state, p), ...(slot ? [homeOf(state, slot)] : [])])) : [1, 1];
  useEffect(() => {
    scene.current!.aim = azimuth(view);
  }, [`${view}`]);
  useEffect(() => {
    const ctx = scene.current!;
    ctx.spot = spot;
    // Steps back in the spotlight, to make room for the flying piece around the cube.
    ctx.reach = new THREE.Vector3(...CAMERA).length() * (spot ? 1.3 : 1);
  }, [spot]);

  return <div ref={host} className="relative h-full w-full touch-none" />;
}
