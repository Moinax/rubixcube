import { useEffect, useRef, useState } from "react";
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
const TARGET = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.12, 1.12, 1.12));
const TARGET_MATERIAL = new THREE.LineBasicMaterial({ color: "#34d399" });
const MATERIALS = new Map<string, THREE.Material>();
const material = (color: string) => {
  if (!MATERIALS.has(color))
    MATERIALS.set(color, new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.6 }));
  return MATERIALS.get(color)!;
};

const PAUSE = 700; // the start position stays in view this long before the move plays

type View = "start" | "play" | "end";

// Single arrow with a bar for start and end, a plain arrow to play.
const CONTROLS: [View, string, React.ReactNode][] = [
  ["start", "Avant le mouvement", <><rect x="5" y="5" width="2.5" height="14" rx="1" /><path d="M19 5v14L9 12z" /></>],
  ["play", "Jouer le mouvement depuis le début", <path d="M7 5v14l12-7z" />],
  ["end", "Après le mouvement", <><path d="M5 5v14l10-7z" /><rect x="16.5" y="5" width="2.5" height="14" rx="1" /></>],
];

type Props = { state: string; move?: string; highlight?: Vec; target?: Vec; autoRotate?: boolean };

/** Renders `state`; when `move` is set, plays it once from `state`, with controls to hold its start or end, or play it again. `highlight` outlines one cubie, `target` (in green) the place it goes to. */
export default function CubeView({ state, move, highlight, target, autoRotate = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ root: THREE.Group; controls: OrbitControls; onFrame?: (t: number) => void; show?: (view: View) => void }>(null);
  const progress = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("play");
  // A new move starts playing: reset during render rather than from the effect.
  const scene3d = `${state}|${move}|${highlight}|${target}`; // what the effect below rebuilds on
  const [shown, setShown] = useState(scene3d);
  if (shown !== scene3d) {
    setShown(scene3d);
    setView("play");
  }

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
          if (target && `${pos}` === `${target}`) mesh.add(new THREE.LineSegments(TARGET, TARGET_MATERIAL));
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
    let pinned: number | undefined; // 0 or 1 holds the start or the end of the move
    ctx.show = (next) => {
      pinned = next === "start" ? 0 : next === "end" ? 1 : undefined;
      start = undefined; // playing restarts from the start position, held for PAUSE
      setView(next);
    };
    ctx.onFrame = (t) => {
      start ??= t;
      const k = pinned ?? Math.min(1, Math.max(0, (t - start - PAUSE) / duration));
      layer.quaternion.setFromAxisAngle(vector, angle * k * k * (3 - 2 * k));
      progress.current?.style.setProperty("width", `${k * 100}%`);
      if (pinned === undefined && k === 1) {
        pinned = 1;
        setView("end");
      }
    };
  }, [state, move, `${highlight}`, `${target}`]);

  return (
    <div className="flex h-full w-full flex-col items-center gap-2">
      <div ref={host} className="min-h-0 w-full flex-1 touch-none" />
      {move && (
        <div className="relative flex gap-1 overflow-hidden rounded-full bg-white/8 p-1 ring-1 ring-white/15">
          {CONTROLS.map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => scene.current?.show?.(id)}
              title={label}
              aria-label={label}
              aria-pressed={view === id}
              className={`grid h-9 w-11 place-items-center rounded-full transition ${
                view === id ? "bg-white text-black" : "text-zinc-200 hover:bg-white/15"
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                {icon}
              </svg>
            </button>
          ))}
          <div ref={progress} className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-emerald-400" />
        </div>
      )}
    </div>
  );
}
