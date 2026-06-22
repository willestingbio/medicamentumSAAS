'use client';
import { useEffect, useState } from 'react';

export function useColorMode() {
  const [colorMode, setColorModeState] = useState<'light' | 'dark'>('light');

  // Read from localStorage only after mount (avoids hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem('color-theme');
    if (stored === 'dark') {
      setColorModeState('dark');
    } else if (!stored) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) setColorModeState('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorMode === 'dark');
  }, [colorMode]);

  const setColorMode = (mode: 'light' | 'dark') => {
    localStorage.setItem('color-theme', mode);
    setColorModeState(mode);
  };

  return [colorMode, setColorMode] as const;
}
