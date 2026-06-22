import { Card, CardContent } from '@/components/ui/card';

export function SkeletonCard() {
  return (
    <Card className="h-full">
      <CardContent className="p-5 flex flex-col h-full">
        {/* Cover skeleton */}
        <div className="aspect-video rounded-lg bg-muted animate-pulse mb-4" />

        {/* Title skeleton */}
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse mb-2" />

        {/* Description skeleton */}
        <div className="space-y-1.5 mb-3">
          <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
          <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
        </div>

        {/* Rating skeleton */}
        <div className="h-3.5 w-1/3 rounded bg-muted animate-pulse" />

        {/* Price skeleton */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="h-6 w-24 rounded bg-muted animate-pulse" />
          <div className="size-9 rounded-full bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
