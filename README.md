# Rubik's Cube

Scan a real 3x3 cube with the camera (or type its colors in), then follow the
solution move by move on an animated 3D cube.

- Solver: [cubejs](https://github.com/ldez/cubejs) (Kociemba two-phase, ≤ 22 moves),
  patched in `patches/` so its `this.Cube` lookup survives bundling.
- 3D: three.js. UI: React + Tailwind.

```sh
pnpm install
pnpm dev       # http://localhost:5173 (webcam works on localhost)
pnpm dev:lan   # HTTPS on the LAN, so a phone can use its camera
pnpm test      # move/solver/validation/color-classification checks
pnpm build
```

Assumes the standard color scheme: white opposite yellow, green opposite blue,
red opposite orange. The guide keeps white on top and green facing you.
