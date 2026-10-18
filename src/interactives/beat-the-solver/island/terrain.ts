/**
 * Ta'ū's terrain and site layout, ported from EcoPulse
 * (`components/terrain.ts` and `sampleGrid` in `lib/elevation.ts`).
 *
 * `tau-elevation.json` is EcoPulse's saved 24 × 24 sample of real elevation
 * over a 12 km box around the island (Open-Meteo elevation API), in metres.
 */
import elevation from "./tau-elevation.json";

type HeightGrid = { n: number; heights: number[]; max: number };

/** Half-width of the rendered terrain in scene units. */
export const HALF = 7;
/** Scene height of the tallest point on the island. */
const PEAK_UNITS = 2.6;

/** Smoothstepped bilinear sample, so the coarse grid doesn't read as facets. */
function sampleGrid(g: HeightGrid, u: number, v: number): number {
  const n = g.n;
  const x = Math.min(n - 1.001, Math.max(0, u * (n - 1)));
  const y = Math.min(n - 1.001, Math.max(0, v * (n - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (r: number, c: number) => g.heights[r * n + c] ?? 0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return (
    at(y0, x0) * (1 - sx) * (1 - sy) +
    at(y0, x0 + 1) * sx * (1 - sy) +
    at(y0 + 1, x0) * (1 - sx) * sy +
    at(y0 + 1, x0 + 1) * sx * sy
  );
}

/** Centroid and extent of land, so the island fills the frame. */
function landFraming(g: HeightGrid) {
  const n = g.n;
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (g.heights[r * n + c] > 0.5) {
        sx += c / (n - 1);
        sy += r / (n - 1);
        count++;
      }
    }
  }
  const cu = count ? sx / count : 0.5;
  const cv = count ? sy / count : 0.5;
  let radius = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (g.heights[r * n + c] > 0.5) {
        radius = Math.max(radius, Math.hypot(c / (n - 1) - cu, r / (n - 1) - cv));
      }
    }
  }
  return { cu, cv, radius: Math.max(0.12, radius) };
}

const grid: HeightGrid = elevation;
const { cu, cv, radius } = landFraming(grid);
const zoom = radius * 1.25;

/** Terrain height in scene units at (x, z); below zero is sea. */
export function heightAt(x: number, z: number): number {
  const u = cu + (x / HALF) * zoom;
  const v = cv + (z / HALF) * zoom;
  if (u < 0 || u > 1 || v < 0 || v > 1) return -0.2;
  const metres = sampleGrid(grid, u, v);
  if (metres <= 0) return -0.2;
  return (metres / grid.max) * PEAK_UNITS;
}

export type SiteId =
  | "solar"
  | "wind"
  | "battery"
  | "generator"
  | "clinic"
  | "pumps"
  | "comms"
  | "homes"
  | "school"
  | "desal"
  | "ice";

export type Site = {
  id: SiteId;
  label: string;
  kind: "source" | "load";
  x: number;
  z: number;
  y: number;
};

const SITE_DEFS: { id: SiteId; label: string; kind: Site["kind"] }[] = [
  { id: "solar", label: "Solar array", kind: "source" },
  { id: "wind", label: "Wind turbine", kind: "source" },
  { id: "battery", label: "Battery bank", kind: "source" },
  { id: "generator", label: "Diesel generator", kind: "source" },
  { id: "clinic", label: "Health clinic", kind: "load" },
  { id: "pumps", label: "Water pumps", kind: "load" },
  { id: "comms", label: "Comms tower", kind: "load" },
  { id: "homes", label: "Homes", kind: "load" },
  { id: "school", label: "School", kind: "load" },
  { id: "desal", label: "Desalination", kind: "load" },
  { id: "ice", label: "Ice plant", kind: "load" },
];

/**
 * Well-separated positions on land by farthest-point sampling, seeded at the
 * highest ground — the same placement EcoPulse uses, so Ta'ū looks the same.
 */
function placeSites(): Site[] {
  const candidates: { x: number; z: number }[] = [];
  const step = (2 * HALF) / 48;
  for (let x = -HALF + step; x < HALF; x += step) {
    for (let z = -HALF + step; z < HALF; z += step) {
      if (heightAt(x, z) > 0.04) candidates.push({ x, z });
    }
  }

  let best = candidates[0];
  for (const c of candidates) if (heightAt(c.x, c.z) > heightAt(best.x, best.z)) best = c;
  const picked = [best];

  while (picked.length < SITE_DEFS.length) {
    let far = candidates[0];
    let farD = -Infinity;
    for (const c of candidates) {
      let d = Infinity;
      for (const p of picked) d = Math.min(d, (c.x - p.x) ** 2 + (c.z - p.z) ** 2);
      if (d > farD) {
        farD = d;
        far = c;
      }
    }
    picked.push(far);
  }

  return SITE_DEFS.map((def, i) => ({
    ...def,
    x: picked[i].x,
    z: picked[i].z,
    y: Math.max(0.05, heightAt(picked[i].x, picked[i].z)),
  }));
}

export const SITES: Site[] = placeSites();
