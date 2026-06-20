'use client';
import { useEffect, useState } from 'react';

export function useColorMode() {
  const [colorMode, setColorModeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('color-theme');
    if (stored === 'dark' || stored === 'light') setColorModeState(stored);
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