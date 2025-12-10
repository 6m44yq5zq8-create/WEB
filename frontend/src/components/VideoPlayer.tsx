/**
 * Video player component with HTML5 video element
 */
'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileInfo } from '@/types';
import { API_URL } from '@/lib/config';

interface VideoPlayerProps {
  file: FileInfo;
  onClose: () => void;
}

export default function VideoPlayer({ file, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const token = typeof window !== 'undefined' ? localStorage.getItem('cloud_storage_token') : null;
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    let mounted = true;
    let mediaSource: MediaSource | null = null;
    let sourceBuffer: SourceBuffer | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let queue: Uint8Array[] = [];

    const cleanup = () => {
      try { if (reader && (reader as any).cancel) (reader as any).cancel(); } catch {}
      try {
        if (sourceBuffer && mediaSource && mediaSource.readyState === 'open') {
          if (!sourceBuffer.updating) mediaSource.endOfStream();
        }
      } catch {}
      queue = [];
      sourceBuffer = null;
      if (mediaSource) try { URL.revokeObjectURL((videoRef.current as HTMLVideoElement).src); } catch {}
      mediaSource = null;
    };

    const initMSE = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('cloud_storage_token') : null;
      const url = `${API_URL}/api/stream/video?path=${encodeURIComponent(file.path)}`;
      try {
        const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!mounted) return;

        if (!resp.ok || !resp.body) {
          const blob = await resp.blob();
          const blobUrl = URL.createObjectURL(blob);
          if (mounted && videoRef.current) videoRef.current.src = blobUrl;
          return;
        }

        const contentType = resp.headers.get('content-type') || 'video/mp4';
        if (!('MediaSource' in window)) {
          const blob = await resp.blob();
          const blobUrl = URL.createObjectURL(blob);
          if (mounted && videoRef.current) videoRef.current.src = blobUrl;
          return;
        }

        mediaSource = new MediaSource();
        if (mounted && videoRef.current) videoRef.current.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener('sourceopen', async () => {
          if (!mediaSource) return;
          try {
            sourceBuffer = mediaSource.addSourceBuffer(contentType as string);
          } catch (err) {
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            if (mounted && videoRef.current) videoRef.current.src = blobUrl;
            return;
          }

          reader = resp.body!.getReader();

          const appendNext = async (chunk: Uint8Array) => {
            return new Promise<void>((resolve) => {
              if (!sourceBuffer) return resolve();
              const onUpdate = () => { sourceBuffer!.removeEventListener('updateend', onUpdate); resolve(); };
              sourceBuffer.addEventListener('updateend', onUpdate);
              try { sourceBuffer.appendBuffer(chunk as any); } catch (e) { resolve(); }
            });
          };

          while (true) {
            const { value, done } = await reader!.read();
            if (value && value.length) {
              if (sourceBuffer!.updating) queue.push(value);
              else {
                await appendNext(value);
                while (queue.length) {
                  const q = queue.shift()!;
                  await appendNext(q);
                }
              }
            }
            if (done) break;
          }

          try { mediaSource.endOfStream(); } catch {}
        });

        setStreaming(true);
      } catch (err) {
        console.error('MSE video fetch error', err);
      }
    };

    initMSE();
    return () => { mounted = false; cleanup(); };
  }, [file.path]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="h-full flex flex-col items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="w-full max-w-6xl mb-4 flex items-center justify-between">
            <h3 className="text-white font-semibold text-lg truncate flex-1">
              {file.name}
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="ml-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>

          {/* Video player */}
          <div
            className="relative w-full max-w-6xl bg-black rounded-2xl overflow-hidden shadow-2xl"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            <video
              ref={videoRef}
              controls
              className="w-full h-auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Custom controls overlay */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={togglePlay}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
                      >
                        {isPlaying ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={changePlaybackRate}
                        className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all"
                      >
                        {playbackRate}x
                      </motion.button>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleFullscreen}
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
                    >
                      {isFullscreen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18h4v-4H6v4zm8-8h4V6h-4v4z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
