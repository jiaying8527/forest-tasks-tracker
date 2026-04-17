import type { Category } from '../domain/category';
import './CategoryTabs.css';

export type CategoryTabValue = string | 'all';

interface Props {
  categories: Category[];
  value: CategoryTabValue;
  onChange: (value: CategoryTabValue) => void;
}

export function CategoryTabs({ categories, value, onChange }: Props) {
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  const tabs: { id: CategoryTabValue; label: string }[] = [
    { id: 'all', label: 'All' },
    ...sorted.map((c) => ({ id: c.id as CategoryTabValue, label: c.name })),
  ];

  return (
    <div className="category-tabs" role="tablist" aria-label="Categories">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          className={`category-tab${value === t.id ? ' is-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
