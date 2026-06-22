'use client';
import { useEffect, useState } from 'react';

function getInitialMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('color-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useColorMode() {
  const [colorMode, setColorModeState] = useState<'light' | 'dark'>(getInitialMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
  }, [colorMode]);

  const setColorMode = (mode: 'light' | 'dark') => {
    localStorage.setItem('color-theme', mode);
    setColorModeState(mode);
  };

  return [colorMode, setColorMode] as const;
}
