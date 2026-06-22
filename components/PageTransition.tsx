'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'exit' | 'idle'>('enter');
  const prevPathname = useRef(pathname);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (prevPathname.current === pathname) {
      setDisplayChildren(children);
      return;
    }

    // Route changed — exit first, then enter
    setTransitionStage('exit');

    timeoutRef.current = setTimeout(() => {
      prevPathname.current = pathname;
      setDisplayChildren(children);
      setTransitionStage('enter');
    }, 200); // exit duration

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname, children]);

  // On initial mount, just enter
  useEffect(() => {
    setTransitionStage('enter');
  }, []);

  return (
    <div
      className={cn(
        'transition-all duration-300',
        transitionStage === 'enter' && 'opacity-100 translate-y-0 blur-0',
        transitionStage === 'exit' && 'opacity-0 translate-y-2 blur-[2px]',
        className
      )}
      style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
    >
      {displayChildren}
    </div>
  );
}
