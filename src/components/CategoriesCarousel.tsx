'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

type Props<T extends string = string> = {
  categories: readonly T[];
  labels: Record<T, string> | Record<string, string>;
  selectedCategory: T;
  onSelect: (c: T) => void;
  className?: string;
  buttonClassName?: string;
};

export default function CategoriesCarousel<T extends string>({
  categories,
  labels,
  selectedCategory,
  onSelect,
  className,
  buttonClassName,
}: Props<T>) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const items = React.useMemo(() => categories.map(String), [categories]) as string[];
  const selectedIndex = items.findIndex((c) => c === String(selectedCategory));

  // Keep the active pill in view
  React.useEffect(() => {
    if (!api || selectedIndex < 0) return;
    // `jump` param true = allow smooth snapping if configured
    api.scrollTo(selectedIndex, true);
  }, [api, selectedIndex]);

  return (
    <div className={cn('relative w-full', className)}>
      <div className="p-1 rounded-lg bg-muted">
        <div className="p-1 rounded-lg bg-muted">
          <Carousel
            setApi={setApi}
            opts={{
              align: 'start',
              containScroll: 'trimSnaps',
              dragFree: true,
            }}
            className="px-10" // space for arrows
            aria-label="Browse categories"
          >
            <CarouselContent className="-ml-2">
              {items.map((key, i) => {
                const isActive = String(selectedCategory) === key;
                const label = (labels as Record<string, string>)[key] ?? key;
                return (
                  <CarouselItem key={key} className="basis-auto pl-2">
                    <Button
                      role="tab"
                      aria-selected={isActive}
                      variant={isActive ? 'default' : 'ghost'}
                      onClick={() => onSelect(key as T)}
                      className={cn(
                        'whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-background/50 hover:text-primary',
                        buttonClassName
                      )}
                    >
                      {label}
                    </Button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            {/* arrows */}
            <CarouselPrevious className="-left-2 top-1/2 -translate-y-1/2 shadow-sm" aria-label="Scroll left" />
            <CarouselNext className="-right-2 top-1/2 -translate-y-1/2 shadow-sm" aria-label="Scroll right" />
          </Carousel>
        </div>
      </div>
    </div>
  );
}
