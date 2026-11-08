import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { findPiece, homeOf } from "./beginner";
import { riders, type Finger } from "./course";
import { tr } from "./i18n";
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
// A finger that has to lift off for the next move fades, so it doesn't block the face; the one that plays gets a ring.
const fingerLook = (solid: THREE.MeshBasicMaterial) => ({ solid, faded: new THREE.MeshBasicMaterial({ color: solid.color, transparent: true, opacity: 0.25 }) });
const [THUMB_LOOK, INDEX_LOOK] = [fingerLook(THUMB), fingerLook(INDEX)];
const RING = new THREE.RingGeometry(0.25, 0.31, 40);
const RING_MATERIAL = new THREE.MeshBasicMaterial({ color: "#f3f2ee" });
const GRIP: [finger: Finger, pos: Vec, normal: Vec, look: typeof THUMB_LOOK][] = [
  ["left thumb", [-1, -1, 1], [0, 0, 1], THUMB_LOOK],
  ["right thumb", [1, -1, 1], [0, 0, 1], THUMB_LOOK],
  ["left index", [-1, 1, -1], [0, 1, 0], INDEX_LOOK],
  ["right index", [1, 1, -1], [0, 1, 0], INDEX_LOOK],
];
const MATERIALS = new Map<string, THREE.MeshPhysicalMaterial>();
const material = (color: string) => {
  if (!MATERIALS.has(color)) MATERIALS.set(color, new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.6 }));
  return MATERIALS.get(color)!;
};

const CAMERA: Vec = [4.6, 4, 6.2];
// A sticker that doesn't matter yet: a blank ("."), dimmer than any color.
export const BLANK = "#3a3d46";

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
  next?: string;
  autoRotate?: boolean;
  below?: boolean;
  onReplay?: () => void;
  peek?: { from: Vec; key: number };
};

/**
 * Renders `state`; when `moves` are set, plays them one after the other from `state`, then calls `onEnd`.
 * `piece` (its colors) is outlined, and `place` (the colors of the centers around it) is a green glass box;
 * so are `pair`, a second piece that goes with it (an F2L edge), and `pairPlace`. A new `replay` count
 * plays the same moves again. `grip` marks where the fingers rest in the home grip: before `next` (the move to
 * play), its fingers stand out and the ones in its way fade; while a move plays, its fingers ride with the face
 * and the ones in its way lift off. `below`: the camera looks from under the cube, at the bottom face. A ↻ in the
 * corner puts back a view turned by hand, shown once it was; with `onReplay`, it is always there and plays again too.
 * A new `peek` tilts the cube the way a hand would to glance at its side `from` (a face the camera doesn't see) and
 * brings it back as it is held to play, in one smooth motion; a hand on the cube stops it.
 */
export default function CubeView({ state, moves, onEnd, piece, place, pair, pairPlace, replay, grip, next, autoRotate = false, below = false, onReplay, peek }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ root: THREE.Group; controls: OrbitControls; onFrame?: (t: number) => void; onCamera?: (t: number) => void }>(null);
  const ended = useRef(onEnd);
  ended.current = onEnd;
  const [turned, setTurned] = useState(false);
  const home = () => {
    const { controls } = scene.current!;
    controls.reset();
    controls.object.position.set(CAMERA[0], below ? -CAMERA[1] : CAMERA[1], CAMERA[2]);
    controls.update();
  };

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
    controls.addEventListener("start", () => setTurned(true));
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
      scene.current?.onCamera?.(t);
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

  useEffect(home, [below]);

  useEffect(() => {
    if (!peek) return;
    const ctx = scene.current!;
    const camera = ctx.controls.object;
    // From the holding angle to the same one mirrored across the hidden face's axis: the cube shows that face.
    const held = new THREE.Vector3(...CAMERA);
    const look = new THREE.Vector3(...CAMERA.map((c, k) => (peek.from[k] < 0 ? -c : c)));
    const glance = 1400; // there and back in one smooth motion, like a glance with the cube in hand
    let start: number | undefined;
    // A hand on the cube stops the tilt where it is: the hand turns it from there.
    const done = () => {
      ctx.onCamera = undefined;
      ctx.controls.removeEventListener("start", done);
    };
    ctx.controls.addEventListener("start", done);
    ctx.onCamera = (t) => {
      start ??= t;
      const k = Math.min(1, (t - start) / glance);
      camera.position.copy(held).lerp(look, (1 - Math.cos(2 * Math.PI * k)) / 2).setLength(held.length());
      if (k === 1) done();
    };
    setTurned(false);
    return done;
  }, [peek?.key]);

  // The pieces to follow, each with the place it goes to.
  const tracked = ([[piece, place], [pair, pairPlace]] as [string | undefined, string | undefined][]).filter((t): t is [string, string | undefined] => !!t[0]);
  useEffect(() => {
    const ctx = scene.current!;
    // The fingers that travel with the turning face, and where each rests in the grip.
    let riding: { dot: THREE.Object3D; home: THREE.Vector3; facing: THREE.Quaternion }[] = [];
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
                return i === undefined ? PLASTIC : material(FACE_COLORS[s[i] as Face] ?? BLANK);
              }),
            );
            mesh.position.set(x, y, z);
            if (mine) mesh.add(new LineSegments2(OUTLINE, PIECE_LINE));
            (move && inLayer(move, pos) ? layer : ctx.root).add(mesh);
          }
      // The fingers making the move ride with the face they turn; the ones in its way lift off; the others rest.
      riding = [];
      const coming = move ?? next;
      if (grip)
        for (const [finger, pos, normal, look] of GRIP) {
          const [plays, inTheWay] = [!!coming && riders(coming).includes(finger), !!coming && inLayer(coming, pos)];
          const lifts = inTheWay && !plays;
          if (lifts && move) continue;
          const dot = new THREE.Mesh(FINGER, lifts ? look.faded : look.solid);
          if (plays) dot.add(new THREE.Mesh(RING, RING_MATERIAL)).scale.setScalar(1.3);
          dot.position.set(...pos).addScaledVector(new THREE.Vector3(...normal), 0.52);
          dot.lookAt(dot.position.clone().add(new THREE.Vector3(...normal)));
          const rides = move && plays && inTheWay;
          (rides ? layer : ctx.root).add(dot);
          if (rides) riding.push({ dot, home: dot.position.clone(), facing: dot.quaternion.clone() });
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
        if (!riding.length) {
          ctx.onFrame = undefined;
          return ended.current?.();
        }
        // The fingers glide back to the grip before the next move.
        const back = riding.map(({ dot, home, facing }) => {
          const [from, turned] = [dot.getWorldPosition(new THREE.Vector3()), dot.getWorldQuaternion(new THREE.Quaternion())];
          ctx.root.add(dot);
          return { dot, from, turned, home, facing };
        });
        const landed = t;
        ctx.onFrame = (now) => {
          const r = ease(Math.min(1, (now - landed) / 350));
          for (const { dot, from, turned, home, facing } of back) {
            dot.position.lerpVectors(from, home, r);
            dot.quaternion.slerpQuaternions(turned, facing, r);
          }
          if (r < 1) return;
          ctx.onFrame = undefined;
          ended.current?.();
        };
      };
    };

    show(state, 0);
  }, [state, moves?.join(" "), piece, place, pair, pairPlace, replay, grip, next]);

  return (
    <div ref={host} className="relative h-full w-full touch-none">
      {(onReplay || turned) && (
        <button
          onClick={() => {
            home();
            setTurned(false);
            onReplay?.();
          }}
          onMouseDown={(e) => e.preventDefault()} // the guide's keys keep working
          title={onReplay ? tr({ fr: "Revoir", nl: "Opnieuw bekijken", en: "Watch again" }) : tr({ fr: "Remettre le cube en place", nl: "Kubus terugzetten", en: "Put the cube back" })}
          aria-label={onReplay ? tr({ fr: "Revoir", nl: "Opnieuw bekijken", en: "Watch again" }) : tr({ fr: "Remettre le cube en place", nl: "Kubus terugzetten", en: "Put the cube back" })}
          className="absolute top-0 right-0 z-10 grid size-9 place-items-center rounded-full border border-edge bg-shell/80 text-mist backdrop-blur hover:text-chalk"
        >
          <svg viewBox="0 0 24 24" className="size-4.5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      )}
    </div>
  );
}
