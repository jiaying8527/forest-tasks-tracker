import { useMemo } from 'react';
import type { Tree as TreeModel } from '../domain/forest';
import { visualForTree } from '../domain/forest';
import { Tree } from './Tree';
import { useAppState } from '../state/store';
import './ForestScene.css';

interface Props {
  trees: TreeModel[];
}

const VIEW_W = 400;
const VIEW_H = 280;
const GROUND = VIEW_H - 30;
const AGGREGATE_THRESHOLD = 500;

export function ForestScene({ trees }: Props) {
  const state = useAppState();
  const tasksById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of state.tasks) map.set(t.id, t.title);
    return map;
  }, [state.tasks]);

  const placements = useMemo(() => {
    return trees.map((tree) => {
      const visual = visualForTree(tree.seed);
      // X across scene with gentle margin; Y determines both depth (scale) and vertical offset.
      const x = 20 + visual.x * (VIEW_W - 40);
      const depth = visual.y; // 0 back, 1 front
      const y = GROUND - depth * 90; // back trees higher
      const scale = visual.scale * (0.7 + depth * 0.55); // perspective scale
      return { tree, visual, x, y, scale };
    });
  }, [trees]);

  const isAggregated = trees.length > AGGREGATE_THRESHOLD;
  const count = trees.length;
  const density = densityClass(count);

  return (
    <div className={`forest-scene forest-density-${density}`} aria-label="Your forest">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-sky)" />
            <stop offset="100%" stopColor="var(--c-bg)" />
          </linearGradient>
          <linearGradient id="earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-earth)" />
            <stop offset="100%" stopColor="#d1c3a8" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={VIEW_W} height={GROUND} fill="url(#sky)" />
        <rect x="0" y={GROUND} width={VIEW_W} height={VIEW_H - GROUND} fill="url(#earth)" />

        {isAggregated ? (
          <AggregatedCanopy count={count} />
        ) : (
          placements
            .slice()
            .sort((a, b) => a.y - b.y) // back-to-front painter order
            .map(({ tree, visual, x, y, scale }, i) => (
              <g key={tree.taskId} transform={`translate(${x} ${y}) scale(${scale})`}>
                <Tree
                  visual={visual}
                  title={tasksById.get(tree.taskId) ?? 'Completed task'}
                  swayPhase={(i % 7) * 0.4}
                />
              </g>
            ))
        )}
      </svg>
    </div>
  );
}

function densityClass(count: number): 'sparse' | 'light' | 'medium' | 'dense' | 'lush' {
  if (count <= 10) return 'sparse';
  if (count <= 50) return 'light';
  if (count <= 200) return 'medium';
  if (count <= AGGREGATE_THRESHOLD) return 'dense';
  return 'lush';
}

function AggregatedCanopy({ count }: { count: number }) {
  const clusters = Math.min(60, Math.ceil(count / 20));
  const items = Array.from({ length: clusters }, (_, i) => {
    const x = 20 + ((i * 37) % (VIEW_W - 40));
    const row = Math.floor(i / 12);
    const y = GROUND - 10 - row * 22;
    const speciesIndex = i % 4;
    return (
      <g key={i} transform={`translate(${x} ${y}) scale(${0.8 + ((i * 13) % 40) / 100})`}>
        <circle cx="0" cy="-6" r="14" fill={canopy(speciesIndex)} />
      </g>
    );
  });
  return (
    <>
      {items}
      <text x={VIEW_W - 12} y={VIEW_H - 12} textAnchor="end" fontSize="10" fill="var(--c-text-muted)">
        {count} trees
      </text>
    </>
  );
}

function canopy(i: number): string {
  switch (i) {
    case 0: return 'var(--c-canopy-1)';
    case 1: return 'var(--c-canopy-2)';
    case 2: return 'var(--c-canopy-3)';
    default: return 'var(--c-canopy-2)';
  }
}
