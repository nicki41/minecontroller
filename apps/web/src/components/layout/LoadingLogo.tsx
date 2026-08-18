/**
 * Branded loading animation: the gem-mark cube (see Logo.tsx) builds face by
 * face while the "mine"/"controller" wordmark flies in and a progress bar
 * fills, then the whole lockup fades out. Everything is a pure function of
 * `progress` (0..1) — callers drive that from real load state (see
 * AppLoadingOverlay / RequireAuth via useTrickleProgress), not a timer.
 *
 * Ported from the Claude Design prototype (minecontroller-loader-scene.jsx),
 * adapted to this app's actual "minecontroller" wordmark and dark-only palette.
 */
const easeOutQuad = (t: number) => 1 - (1 - t) ** 2;
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function mapRange(progress: number, from: number, to: number, ease: (t: number) => number = easeOutQuad) {
  return ease(clamp01((progress - from) / (to - from)));
}

// 4x4 voxel-style variants per facet, matching the design prototype's texture.
function mk(base: string, variants: string[]) {
  return Array.from({ length: 16 }, (_, i) => variants[(i * 7 + (i % 4)) % variants.length] || base);
}
const TOP = mk("#e8a4c4", ["#e8a4c4", "#f0bcd3", "#e090ba", "#f4c9dc"]);
const RIGHT = mk("#d6598f", ["#d6598f", "#c23f79", "#e070a0", "#b8386c"]);
const LEFT = mk("#2a2a30", ["#2a2a30", "#343440", "#242429", "#3a3a42"]);

function Face({ clip, cells, opacity }: { clip: string; cells: string[]; opacity: number }) {
  return (
    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4" style={{ clipPath: clip, opacity }}>
      {cells.map((c, i) => (
        <div key={i} style={{ background: c }} />
      ))}
    </div>
  );
}

function Cube({ size, opacity, scale, faceStagger }: { size: number; opacity: number; scale: number; faceStagger: [number, number, number] }) {
  return (
    <div style={{ width: size, height: size, position: "relative", opacity, transform: `scale(${scale})` }}>
      <Face clip="polygon(50% 0%, 100% 27%, 50% 54%, 0% 27%)" cells={TOP} opacity={faceStagger[0]} />
      <Face clip="polygon(0% 27%, 50% 54%, 50% 100%, 0% 73%)" cells={LEFT} opacity={faceStagger[1]} />
      <Face clip="polygon(100% 27%, 50% 54%, 50% 100%, 100% 73%)" cells={RIGHT} opacity={faceStagger[2]} />
    </div>
  );
}

export function LoadingLogo({ progress }: { progress: number }) {
  const p = clamp01(progress);

  const fadeOut = mapRange(p, 0.95, 1);
  const lockupOpacity = 1 - fadeOut;

  const faceStagger: [number, number, number] = [
    mapRange(p, 0, 0.14) * lockupOpacity,
    mapRange(p, 0.1, 0.26) * lockupOpacity,
    mapRange(p, 0.2, 0.4) * lockupOpacity,
  ];
  const buildP = mapRange(p, 0, 0.4, easeOutQuart);
  const cubeScale = (0.82 + 0.18 * buildP) * (1 - 0.1 * fadeOut);

  const mineOpacity = mapRange(p, 0.5, 0.68) * lockupOpacity;
  const mineY = 8 * (1 - mapRange(p, 0.5, 0.68));

  const panelOffset = -120 * (1 - mapRange(p, 0.72, 0.94, easeOutQuart));
  const panelOpacity = mapRange(p, 0.7, 0.82) * lockupOpacity;

  const progressPct = clamp01(p) * 100;

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <Cube size={112} opacity={lockupOpacity} scale={cubeScale} faceStagger={faceStagger} />
      <div className="flex items-baseline gap-0 overflow-visible text-3xl" style={{ letterSpacing: "-0.01em" }}>
        <span className="text-muted-foreground" style={{ opacity: mineOpacity, transform: `translateY(${mineY}px)` }}>
          mine
        </span>
        <span className="font-bold text-primary" style={{ opacity: panelOpacity, transform: `translateX(${panelOffset}px)` }}>
          controller
        </span>
      </div>
      <div className="h-[3px] w-56 overflow-hidden rounded-full bg-secondary" style={{ opacity: lockupOpacity }}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}
