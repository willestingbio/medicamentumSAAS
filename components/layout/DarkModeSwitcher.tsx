'use client';
import { Moon, Sun } from 'lucide-react';
import { useColorMode } from '@/hooks/useColorMode';
import { Button } from '@/components/ui/button';

export function DarkModeSwitcher() {
  const [colorMode, setColorMode] = useColorMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
      className="size-9 rounded-full"
      aria-label="Cambiar modo"
    >
      {colorMode === 'dark' ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}