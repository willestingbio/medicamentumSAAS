import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

export function ProductReviews({ reviews }: { reviews: Review[] }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Reseñas ({reviews.length})
      </h2>
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-primary">
                  {getInitials(review.author)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{review.author}</p>
                  <time className="text-xs text-muted-foreground shrink-0">{review.date}</time>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "size-3.5",
                        star <= review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-muted text-muted-foreground"
                      )}
                    />
                  ))}
                </div>

                {/* Comment */}
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
