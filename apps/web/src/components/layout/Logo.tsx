/**
 * Three-facet gem mark from the minecraftpanel design mockup
 * (minecraftpanel.dc.html). The mockup renders each facet as a 4x4 grid of
 * slightly-varied pixels for a voxel texture, but that's illegible at the
 * 16-24px sizes this actually renders at in the app chrome (sidebar,
 * auth screens) — flat facets keep the recognizable silhouette and the
 * three-tone color story, which is what reads at icon size.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="50,0 100,27 50,54 0,27" fill="#e8a4c4" />
      <polygon points="0,27 50,54 50,100 0,73" fill="#2a2a30" />
      <polygon points="100,27 50,54 50,100 100,73" fill="#d6598f" />
    </svg>
  );
}
