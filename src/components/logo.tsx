import Image from 'next/image';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  variant?: 'mark' | 'full';
  priority?: boolean;
};

export function Logo({ className, variant = 'mark', priority = false }: LogoProps) {
  const isFull = variant === 'full';

  return (
    <Image
      src={isFull ? '/brand/logo-equiprogress.png' : '/brand/logo-mark.png'}
      alt="EquiProgress"
      width={isFull ? 640 : 256}
      height={isFull ? 360 : 256}
      priority={priority}
      className={cn('object-contain', className)}
    />
  );
}
