'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ArrowUpDown } from 'lucide-react';

const categories = [
  { id: 'all', label: 'Todos' },
  { id: 'course', label: 'Cursos' },
  { id: 'vr_experience', label: 'Experiencias VR' },
  { id: 'ai_automation', label: 'Automatizaciones' },
];

const sortOptions = [
  { id: 'popular', label: 'Más populares' },
  { id: 'price-asc', label: 'Menor precio' },
  { id: 'price-desc', label: 'Mayor precio' },
  { id: 'rating', label: 'Mejor valorados' },
];

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortOpen, setSortOpen] = useState(false);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all' && value !== 'popular') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/productos?${params.toString()}`);
  }

  const activeCategory = searchParams.get('type') || 'all';
  const activeSort = searchParams.get('sort') || 'popular';
  const activeSortLabel = sortOptions.find((o) => o.id === activeSort)?.label || 'Más populares';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateParams('type', cat.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 btn-press",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 btn-press",
            "bg-background hover:bg-accent"
          )}
        >
          <ArrowUpDown className="size-4 text-muted-foreground" />
          {activeSortLabel}
        </button>

        {sortOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-popover shadow-lg z-50 py-1 origin-top-right"
              style={{ animation: 'dropdown-in 150ms cubic-bezier(0.23, 1, 0.32, 1) forwards' }}
            >
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    updateParams('sort', opt.id);
                    setSortOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors duration-150",
                    activeSort === opt.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
