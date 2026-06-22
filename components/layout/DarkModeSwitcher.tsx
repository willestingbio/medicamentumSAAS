'use client';
import { Moon, Sun } from 'lucide-react';
import { useColorMode } from '@/hooks/useColorMode';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function DarkModeSwitcher() {
  const [colorMode, setColorMode] = useColorMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
      className="size-9 rounded-full"
      aria-label="Cambiar modo"
    >
      {mounted ? (
        colorMode === 'dark' ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )
      ) : (
        <div className="size-4" />
      )}
    </Button>
  );
}
