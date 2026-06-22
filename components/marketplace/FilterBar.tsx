'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  return (
    <div className="space-y-4">
      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos, VR, automatizaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {sortOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
