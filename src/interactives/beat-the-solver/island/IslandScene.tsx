"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { DIESEL_L_PER_KWH, SHIFTABLE, loadKwAt, type BaseLoadId, type HourResult } from "../engine";
import { HALF, SITES, heightAt, type Site } from "./terrain";

/**
 * Ta'ū in 3D, ported from EcoPulse's `components/IslandScene.tsx` and driven
 * by the player's schedule instead of the solver's: every hour shows which
 * sources are feeding the island and what is running.
 *
 * Changes from the original: the sky follows the hour so the scene sits on a
 * light page, colours come from the site palette (cobalt = clean power and
 * your scheduled loads, red = diesel), wheel-zoom is off so the canvas never
 * steals page scrolling, and touch devices get no orbit controls for the same
 * reason.
 */

/*
 * Mondrian primaries. On the dark sea the sun uses the bright yellow (the
 * ochre chart colour is for the light page); blue is lifted a little so its
 * emissive glow still reads at night.
 */
const COLOR = {
  clean: "#2a5fbf",
  diesel: "#d3202a",
  sun: "#f4c52d",
  loadOn: "#f2ece0",
  loadLine: "#b9b1a1",
  off: "#8f8a80",
  daySky: "#dfe7ee",
  duskSky: "#e9c9a8",
  nightSky: "#0f1a2e",
} as const;

const SOURCE_COLOR: Record<string, string> = {
  solar: COLOR.sun,
  wind: COLOR.clean,
  battery: COLOR.clean,
  generator: COLOR.diesel,
};

/** 0 at night, 1 in full day, from the sun's height on a 6 am–6 pm arc. */
function daylight(hour: number): number {
  const altitude = Math.sin(((hour - 6) / 12) * Math.PI);
  return Math.max(0, Math.min(1, altitude * 2.2));
}

function skyColor(hour: number): THREE.Color {
  const light = daylight(hour);
  const night = new THREE.Color(COLOR.nightSky);
  const day = new THREE.Color(COLOR.daySky);
  // A warm band right around sunrise and sunset.
  const dusk = new THREE.Color(COLOR.duskSky);
  const base = new THREE.Color().lerpColors(night, day, light);
  const warmth = Math.max(0, 1 - Math.abs(light - 0.35) / 0.35) * 0.45;
  return base.lerp(dusk, warmth);
}

/* ---------------------------------------------------------------- terrain */

function Terrain() {
  const geometry = useMemo(() => {
    const segments = 150;
    const g = new THREE.PlaneGeometry(HALF * 2, HALF * 2, segments, segments);
    g.rotateX(-Math.PI / 2);
    const position = g.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const seabed = new THREE.Color("#1d4a5e");
    const sand = new THREE.Color("#cdb88a");
    const low = new THREE.Color("#4f7d4f");
    const mid = new THREE.Color("#5f7f55");
    const rock = new THREE.Color("#867a68");

    for (let i = 0; i < position.count; i++) {
      const y = heightAt(position.getX(i), position.getZ(i));
      position.setY(i, y);
      const c = new THREE.Color();
      if (y <= 0) c.copy(seabed);
      else if (y < 0.09) c.copy(sand);
      else if (y < 1) c.lerpColors(low, mid, y);
      else c.lerpColors(mid, rock, Math.min(1, (y - 1) / 1.4));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} flatShading />
    </mesh>
  );
}

function Ocean({ light, animate }: { light: number; animate: boolean }) {
  // Three.js objects are mutated every frame, so they are reached through
  // refs rather than memoised values (React treats those as immutable).
  const surface = useRef<THREE.Mesh>(null);
  const flat = useRef<Float32Array | null>(null);

  // Layered sine waves, largest first, so the surface moves without a shader.
  // The plane is rotated flat, so its local z is world height.
  useFrame(({ clock }) => {
    if (!animate || !surface.current) return;
    const geometry = surface.current.geometry;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    flat.current ??= Float32Array.from(position.array);
    const base = flat.current;
    const t = clock.getElapsedTime();
    for (let i = 0; i < position.count; i++) {
      const x = base[i * 3];
      const z = -base[i * 3 + 1];
      position.setZ(
        i,
        Math.sin(x * 0.16 + t * 0.55) * 0.11 +
          Math.sin(z * 0.21 - t * 0.42) * 0.09 +
          Math.sin((x + z) * 0.34 + t * 0.9) * 0.045,
      );
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  const water = new THREE.Color().lerpColors(new THREE.Color("#0b2340"), new THREE.Color("#2f7fa8"), light);
  const shallows = new THREE.Color().lerpColors(new THREE.Color("#12406a"), new THREE.Color("#6cc0dc"), light);

  return (
    <group>
      <mesh ref={surface} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <planeGeometry args={[150, 150, 90, 90]} />
        <meshStandardMaterial color={water} roughness={0.3 + (1 - light) * 0.2} metalness={0.4} transparent opacity={0.97} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[5.6, 9.2, 96]} />
        <meshBasicMaterial color={shallows} transparent opacity={0.18 + light * 0.14} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[5.35, 6.1, 96]} />
        <meshBasicMaterial color="#e6f4f8" transparent opacity={0.12 + light * 0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ sky */

const INITIAL_SKY = "#dfe7ee";

/** Eases the background and fog toward the hour's sky; snaps in calm mode. */
function Sky({ hour, calm }: { hour: number; calm: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const background = useRef<THREE.Color>(null);
  const fog = useRef<THREE.Fog>(null);
  const target = useMemo(() => skyColor(hour), [hour]);

  // In calm mode the canvas only draws on demand; ask for the frame that
  // applies the new sky.
  useEffect(() => invalidate(), [target, invalidate]);

  useFrame((_, delta) => {
    if (!background.current || !fog.current) return;
    const alpha = calm ? 1 : 1 - Math.pow(0.02, delta);
    background.current.lerp(target, alpha);
    fog.current.color.copy(background.current);
  });

  return (
    <>
      <color ref={background} attach="background" args={[INITIAL_SKY]} />
      <fog ref={fog} attach="fog" args={[INITIAL_SKY, 22, 52]} />
    </>
  );
}

/** Sun and moon ride the same arc, half a day apart. */
function Celestial({ hour }: { hour: number }) {
  const sunAngle = ((hour - 6) / 12) * Math.PI;
  const place = (angle: number): [number, number, number] => [
    Math.cos(angle) * 26,
    Math.sin(angle) * 9 + 1.8,
    -3,
  ];
  const sun = place(sunAngle);
  const moon = place(sunAngle + Math.PI);
  const altitude = Math.max(0, Math.sin(sunAngle));
  const sunColor = new THREE.Color().lerpColors(
    new THREE.Color("#ff8a4c"),
    new THREE.Color("#fff2cf"),
    Math.min(1, altitude * 1.6),
  );

  return (
    <>
      {sun[1] > 0 ? (
        <group position={sun}>
          <mesh>
            <sphereGeometry args={[0.62, 28, 28]} />
            <meshBasicMaterial color={sunColor} toneMapped={false} fog={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[1.05, 24, 24]} />
            <meshBasicMaterial color={sunColor} transparent opacity={0.22} depthWrite={false} toneMapped={false} fog={false} />
          </mesh>
          <pointLight color={sunColor} intensity={11} distance={52} decay={2} />
        </group>
      ) : null}
      {moon[1] > 0 ? (
        <group position={moon}>
          <mesh>
            <sphereGeometry args={[0.44, 26, 26]} />
            <meshBasicMaterial color="#e3e9f7" toneMapped={false} fog={false} />
          </mesh>
          <pointLight color="#9fb4dd" intensity={4} distance={42} decay={2} />
        </group>
      ) : null}
    </>
  );
}

function Stars({ visible }: { visible: number }) {
  const positions = useMemo(() => {
    const points: number[] = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 240; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = rand() * Math.PI * 0.4;
      points.push(
        Math.cos(theta) * Math.sin(phi + 0.1) * 44,
        Math.cos(phi) * 44 * 0.7 + 4,
        Math.sin(theta) * Math.sin(phi + 0.1) * 44,
      );
    }
    return new Float32Array(points);
  }, []);

  if (visible <= 0.01) return null;
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.3} color="#dce6ff" transparent opacity={visible * 0.9} sizeAttenuation depthWrite={false} fog={false} />
    </points>
  );
}

/* -------------------------------------------------------- power on the map */

function Flow({
  from,
  to,
  power,
  color,
  animate,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  power: number;
  color: string;
  animate: boolean;
}) {
  const curve = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5);
    mid.y += from.distanceTo(to) * 0.26 + 0.45;
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to]);

  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: Math.min(0.75, 0.3 + power / 1600),
    });
    return new THREE.Line(geometry, material);
  }, [curve, color, power]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );

  const count = Math.max(1, Math.min(7, Math.round(power / 90)));
  const dots = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!dots.current) return;
    const t = animate ? clock.getElapsedTime() : 0;
    for (let i = 0; i < count; i++) {
      dummy.position.copy(curve.getPoint((t * 0.34 + i / count) % 1));
      dummy.scale.setScalar(0.075);
      dummy.updateMatrix();
      dots.current.setMatrixAt(i, dummy.matrix);
    }
    dots.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <primitive object={line} />
      <instancedMesh ref={dots} args={[undefined, undefined, count]} key={count}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function Marker({
  site,
  color,
  active,
  intensity,
  pulse,
  detail,
  hoverable,
  hovered,
  onHover,
}: {
  site: Site;
  color: string;
  active: boolean;
  intensity: number;
  /** Throb the beacon, for the generator while it burns diesel. */
  pulse: boolean;
  detail: string[];
  hoverable: boolean;
  /** Hover is owned by the canvas wrapper so it can be cleared from outside. */
  hovered: boolean;
  onHover: (id: Site["id"], hovering: boolean) => void;
}) {
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const height = site.kind === "source" ? 0.46 : 0.3;
  const length = Math.hypot(site.x, site.z) || 1;
  const glow = active ? 1.1 + intensity * 1.6 : 0.2;

  useFrame(({ clock }) => {
    if (!beacon.current) return;
    beacon.current.emissiveIntensity = pulse ? glow + Math.sin(clock.getElapsedTime() * 6) * 0.9 + 0.9 : glow;
  });

  return (
    <group position={[site.x, site.y, site.z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, height, 10]} />
        <meshStandardMaterial
          color={active ? color : COLOR.off}
          emissive={active ? color : "#000000"}
          emissiveIntensity={active ? 0.4 + intensity : 0}
        />
      </mesh>

      {hoverable ? (
        <mesh
          position={[0, height + 0.1, 0]}
          onPointerOver={(event) => {
            event.stopPropagation();
            onHover(site.id, true);
          }}
          onPointerOut={() => onHover(site.id, false)}
        >
          <sphereGeometry args={[0.42, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}

      <mesh position={[0, height + 0.1, 0]}>
        <sphereGeometry args={[hovered ? 0.17 : 0.12, 16, 16]} />
        <meshStandardMaterial ref={beacon} color={active ? color : COLOR.off} emissive={active ? color : "#5a5650"} emissiveIntensity={glow} />
      </mesh>

      {hovered ? (
        // pointerEvents none: a tooltip that catches the cursor makes the
        // canvas report "left the beacon", hiding it again — a flicker loop.
        <Html
          center
          pointerEvents="none"
          distanceFactor={9}
          position={[(site.x / length) * 0.5, height + 0.75, (site.z / length) * 0.5]}
          zIndexRange={[40, 0]}
        >
          <div className="pointer-events-none flex flex-col gap-0.5 whitespace-nowrap rounded-lg border border-line bg-surface/95 px-3 py-2 text-[13px] text-text shadow-lg">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="size-2 rounded-none" style={{ background: active ? color : COLOR.off }} />
              {site.label}
            </span>
            {detail.map((line) => (
              <span key={line} className="text-muted">
                {line}
              </span>
            ))}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

/** Touch devices get no orbit controls (they'd swallow page scrolling), so the island turns itself. */
function SlowSpin({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (enabled && group.current) group.current.rotation.y += delta * 0.05;
  });
  return <group ref={group}>{children}</group>;
}

/**
 * EcoPulse's camera direction, pulled in or pushed back to suit the canvas:
 * the game's strip is much wider than EcoPulse's panel, and a phone is much
 * narrower, so one fixed distance leaves the island tiny or cropped.
 */
const CAMERA_DIRECTION = new THREE.Vector3(10.2, 5.4, 11.2).normalize();
const LOOK_AT = new THREE.Vector3(0, 1.05, 0);

function FramedCamera() {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  const distance = aspect >= 2.2 ? 13 : aspect >= 1.5 ? 16 : 22;
  const position = useMemo(
    () => CAMERA_DIRECTION.clone().multiplyScalar(distance).toArray() as [number, number, number],
    [distance],
  );

  // OrbitControls aims the camera on desktop; touch devices have no controls,
  // so aim it here too or it stares straight past the island.
  useLayoutEffect(() => {
    camera.current?.lookAt(LOOK_AT);
  }, [position]);

  return <PerspectiveCamera ref={camera} makeDefault position={position} fov={34} />;
}

/* ------------------------------------------------------------------ scene */

type SceneProps = {
  hour: number;
  result: HourResult;
  calm: boolean;
  touch: boolean;
  hoveredId: Site["id"] | null;
  onHover: (id: Site["id"], hovering: boolean) => void;
  /** Drops any hover, e.g. when a drag starts. */
  onClearHover: () => void;
  /** Auto-rotation pauses while the cursor is over the map, so beacons hold still to hover. */
  pointerInside: boolean;
};

const BASE_LOAD_IDS = new Set<string>(["clinic", "pumps", "comms", "homes", "school"]);

function siteDetail(site: Site, hour: number, result: HourResult): string[] {
  switch (site.id) {
    case "solar":
      return [result.solarKw > 1 ? `${Math.round(result.solarKw)} kW right now` : "Idle: no sun"];
    case "wind":
      return [`${Math.round(result.windKw)} kW right now`];
    case "battery":
      return [
        result.batteryKw > 1
          ? `Supplying ${Math.round(result.batteryKw)} kW`
          : result.batteryKw < -1
            ? `Charging ${Math.round(-result.batteryKw)} kW`
            : "Holding",
        `${Math.round(result.batterySoc * 100)}% charged`,
      ];
    case "generator":
      return result.dieselKw > 0.5
        ? [`${Math.round(result.dieselKw)} kW`, `${Math.round(result.dieselKw * DIESEL_L_PER_KWH)} L of diesel this hour`]
        : ["Off"];
    case "desal":
    case "ice": {
      const load = SHIFTABLE[site.id];
      const lines = [result.ran[site.id] ? `${load.kw} kW · scheduled by you` : "Not scheduled this hour"];
      if (site.id === "desal") lines.push(`${Math.round(result.tankM3)} m³ in the water tank`);
      return lines;
    }
    default:
      return [`${Math.round(loadKwAt(site.id as BaseLoadId, hour))} kW draw`, "Always on"];
  }
}

function Scene({ hour, result, calm, touch, hoveredId, onHover, onClearHover, pointerInside }: SceneProps) {
  const dragging = useRef(false);
  const light = daylight(hour);
  const angle = ((hour - 6) / 12) * Math.PI;

  const hub = useMemo(() => {
    const peak = SITES.reduce((best, site) => (site.y > best.y ? site : best), SITES[0]);
    return new THREE.Vector3(peak.x * 0.3, peak.y + 1.3, peak.z * 0.3);
  }, []);

  const anchors = useMemo(
    () =>
      Object.fromEntries(
        SITES.map((site) => [site.id, new THREE.Vector3(site.x, site.y + (site.kind === "source" ? 0.55 : 0.4), site.z)]),
      ),
    [],
  );

  const sourcePower: Record<string, number> = {
    solar: result.solarKw,
    wind: result.windKw,
    battery: Math.max(0, result.batteryKw),
    generator: result.dieselKw,
  };

  const running = (site: Site) => BASE_LOAD_IDS.has(site.id) || (site.id === "desal" && result.ran.desal) || (site.id === "ice" && result.ran.ice);

  return (
    <>
      <FramedCamera />
      <Sky hour={hour} calm={calm} />
      <ambientLight intensity={0.42 + light * 0.3} />
      <directionalLight
        position={[Math.cos(angle) * 11, Math.max(Math.sin(angle) * 9, 0.6), 4]}
        intensity={0.15 + light * 1.4}
        color={light > 0 ? "#fff3e0" : "#4a6ea8"}
      />
      <hemisphereLight args={["#9fb7d6", "#3a352c", 0.38 + light * 0.2]} />

      <Celestial hour={hour} />
      <Stars visible={1 - light} />

      <SlowSpin enabled={touch && !calm}>
        <Terrain />
        <Ocean light={light} animate={!calm} />

        {SITES.map((site) => {
          const isSource = site.kind === "source";
          const power = sourcePower[site.id] ?? 0;
          const scheduled = site.id === "desal" || site.id === "ice";
          const color = isSource ? SOURCE_COLOR[site.id] : scheduled ? COLOR.clean : COLOR.loadOn;
          return (
            <Marker
              key={site.id}
              site={site}
              color={color}
              active={isSource ? power > 1 : running(site)}
              intensity={isSource ? Math.min(1, power / 900) : 0.25}
              pulse={site.id === "generator" && power > 0.5 && !calm}
              detail={siteDetail(site, hour, result)}
              hoverable={!touch}
              hovered={hoveredId === site.id}
              onHover={(id, hovering) => {
                if (hovering && dragging.current) return;
                onHover(id, hovering);
              }}
            />
          );
        })}

        {SITES.filter((site) => site.kind === "source" && (sourcePower[site.id] ?? 0) > 1).map((site) => (
          <Flow
            key={site.id}
            from={anchors[site.id]}
            to={hub}
            power={sourcePower[site.id]}
            color={SOURCE_COLOR[site.id]}
            animate={!calm}
          />
        ))}

        {SITES.filter((site) => site.kind === "load" && running(site)).map((site) => (
          <Flow
            key={site.id}
            from={hub}
            to={anchors[site.id]}
            power={260}
            color={site.id === "desal" || site.id === "ice" ? COLOR.clean : COLOR.loadLine}
            animate={!calm}
          />
        ))}
      </SlowSpin>

      {!touch ? (
        <OrbitControls
          target={LOOK_AT}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 5}
          maxPolarAngle={Math.PI / 2.06}
          autoRotate={!calm && !pointerInside}
          autoRotateSpeed={0.16}
          onStart={() => {
            dragging.current = true;
            onClearHover();
          }}
          onEnd={() => {
            dragging.current = false;
          }}
        />
      ) : null}
    </>
  );
}

/* --------------------------------------------------------------- canvas */

/**
 * In calm mode the canvas only draws when asked. Coming back on screen (after
 * the loop was paused) or switching modes changes no scene props, and the
 * browser may have dropped the last frame, so ask for a fresh one.
 */
function RedrawOn({ signal }: { signal: string }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => invalidate(), [signal, invalidate]);
  return null;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function IslandScene({ hour, result, calm }: Pick<SceneProps, "hour" | "result" | "calm">) {
  // This module only ever loads in the browser (dynamic import, ssr: false),
  // so reading the environment in initializers is safe.
  const [webgl] = useState(hasWebGL);
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const wrapper = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [hoveredId, setHoveredId] = useState<Site["id"] | null>(null);
  const [pointerInside, setPointerInside] = useState(false);

  // Stop rendering entirely while scrolled away, so the scene costs nothing
  // when nobody is looking at it.
  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!webgl) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-faint">
        The 3D island needs WebGL, which this browser has turned off. The game below still works.
      </div>
    );
  }

  return (
    <div
      ref={wrapper}
      className="h-full w-full"
      // The cursor is set here rather than on <body>, so it can never be left
      // stuck as a hand after the tooltip's beacon unmounts.
      style={{ cursor: hoveredId ? "pointer" : touch ? "auto" : "grab" }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setPointerInside(true);
      }}
      onPointerLeave={() => {
        setPointerInside(false);
        setHoveredId(null);
      }}
    >
      <Canvas
        dpr={[1, 2]}
        frameloop={!onScreen ? "never" : calm ? "demand" : "always"}
        aria-hidden="true"
      >
        <RedrawOn signal={`${onScreen}-${calm}`} />
        <Scene
          hour={hour}
          result={result}
          calm={calm}
          touch={touch}
          hoveredId={hoveredId}
          // Functional update: leaving beacon A and entering neighbour B can
          // land in either order, and only A's own "out" may clear A.
          onHover={(id, hovering) =>
            setHoveredId((current) => (hovering ? id : current === id ? null : current))
          }
          onClearHover={() => setHoveredId(null)}
          pointerInside={pointerInside}
        />
      </Canvas>
    </div>
  );
}
