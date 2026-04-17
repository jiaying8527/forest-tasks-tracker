import type { TreeVisual } from '../domain/forest';
import './Tree.css';

interface Props {
  visual: TreeVisual;
  title?: string;
  swayPhase?: number; // 0..1
}

export function Tree({ visual, title, swayPhase = 0 }: Props) {
  const { speciesIndex } = visual;
  return (
    <g className={`tree tree-species-${speciesIndex}`} style={{ ['--sway-delay' as string]: `${swayPhase}s` }}>
      {title ? <title>{title}</title> : null}
      {renderSpecies(speciesIndex)}
    </g>
  );
}

function renderSpecies(i: number) {
  switch (i) {
    case 0:
      return (
        <>
          <rect x="-2" y="0" width="4" height="14" fill="var(--c-trunk)" rx="1" />
          <circle cx="0" cy="-4" r="14" fill="var(--c-canopy-2)" />
          <circle cx="-8" cy="0" r="10" fill="var(--c-canopy-1)" />
          <circle cx="8" cy="0" r="10" fill="var(--c-canopy-3)" />
        </>
      );
    case 1:
      return (
        <>
          <rect x="-1.5" y="0" width="3" height="18" fill="var(--c-trunk)" rx="1" />
          <polygon points="0,-20 14,2 -14,2" fill="var(--c-canopy-3)" />
          <polygon points="0,-12 10,5 -10,5" fill="var(--c-canopy-2)" />
        </>
      );
    case 2:
      return (
        <>
          <rect x="-2" y="0" width="4" height="16" fill="var(--c-trunk)" rx="1" />
          <ellipse cx="0" cy="-4" rx="16" ry="10" fill="var(--c-canopy-1)" />
          <ellipse cx="-6" cy="-2" rx="6" ry="5" fill="var(--c-canopy-2)" />
        </>
      );
    case 3:
    default:
      return (
        <>
          <rect x="-2" y="0" width="4" height="20" fill="var(--c-trunk)" rx="1" />
          <circle cx="0" cy="-6" r="10" fill="var(--c-canopy-3)" />
          <circle cx="-6" cy="-2" r="8" fill="var(--c-canopy-2)" />
          <circle cx="6" cy="-2" r="8" fill="var(--c-canopy-1)" />
        </>
      );
  }
}
