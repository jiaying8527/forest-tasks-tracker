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

function renderSpecies(_i: number) {
  return (
    <>
      <rect x="-1.5" y="0" width="3" height="18" fill="var(--c-trunk)" rx="1" />
      <polygon points="0,-20 14,2 -14,2" fill="var(--c-canopy-3)" />
      <polygon points="0,-12 10,5 -10,5" fill="var(--c-canopy-2)" />
    </>
  );
}
