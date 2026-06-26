'use client';

import { useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  poster?: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  className?: string;
}

export function HlsPlayer({ src, poster, onProgress, onEnded, className }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;
    onProgress(video.currentTime, video.duration);
  }, [onProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (src.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('[HLS] Fatal error:', data.type, data.details);
          hls.destroy();
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = src;
    } else {
      console.error('[HLS] Not supported in this browser');
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', () => onEnded?.());

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', () => onEnded?.());
    };
  }, [handleTimeUpdate, onEnded]);

  return (
    <video
      ref={videoRef}
      controls
      poster={poster}
      className={`w-full rounded-lg bg-black ${className ?? ''}`}
      playsInline
    >
      Tu navegador no soporta la reproducción de video.
    </video>
  );
}
