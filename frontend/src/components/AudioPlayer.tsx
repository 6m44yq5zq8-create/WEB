/**
 * Audio player component with liquid glass design
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileInfo } from '@/types';
import { API_URL, TOKEN_KEY } from '@/lib/config';

interface AudioPlayerProps {
  file: FileInfo;
  onClose: () => void;
}

export default function AudioPlayer({ file, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [streaming, setStreaming] = useState(false);

  // Use MediaSource to stream authenticated media via fetch with Authorization header.
  useEffect(() => {
    let mounted = true;
    let mediaSource: MediaSource | null = null;
    let sourceBuffer: SourceBuffer | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let queue: Uint8Array[] = [];

    const cleanup = () => {
      if (reader && (reader as any).cancel) (reader as any).cancel();
      try {
        if (sourceBuffer && mediaSource && mediaSource.readyState === 'open') {
          // try to signal end
          if (!sourceBuffer.updating) mediaSource.endOfStream();
        }
      } catch {}
      queue = [];
      sourceBuffer = null;
      if (mediaSource) {
        try { URL.revokeObjectURL((audioRef.current as HTMLAudioElement).src); } catch {}
      }
      mediaSource = null;
    };

    const initMSE = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      const url = `${API_URL}/api/stream/audio?path=${encodeURIComponent(file.path)}`;

      try {
        const resp = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!mounted) return;

        if (!resp.ok || !resp.body) {
          // fallback: download full blob
          const blob = await resp.blob();
          const blobUrl = URL.createObjectURL(blob);
          if (mounted && audioRef.current) audioRef.current.src = blobUrl;
          return;
        }

        const contentType = resp.headers.get('content-type') || 'audio/mpeg';

        if (!('MediaSource' in window)) {
          // fallback
          const blob = await resp.blob();
          const blobUrl = URL.createObjectURL(blob);
          if (mounted && audioRef.current) audioRef.current.src = blobUrl;
          return;
        }

        mediaSource = new MediaSource();
        if (mounted && audioRef.current) audioRef.current.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener('sourceopen', async () => {
          if (!mediaSource) return;
          try {
            // try to create a sourceBuffer for the reported MIME type
            sourceBuffer = mediaSource.addSourceBuffer(contentType as string);
          } catch (err) {
            // If cannot create sourceBuffer for this type, fallback to blob
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            if (mounted && audioRef.current) audioRef.current.src = blobUrl;
            return;
          }

          reader = resp.body!.getReader();

          const appendNext = async (chunk: Uint8Array) => {
            return new Promise<void>((resolve) => {
              if (!sourceBuffer) return resolve();
              const onUpdate = () => {
                sourceBuffer!.removeEventListener('updateend', onUpdate);
                resolve();
              };
              sourceBuffer.addEventListener('updateend', onUpdate);
              try {
                sourceBuffer.appendBuffer(chunk as any);
              } catch (e) {
                // append error -> resolve to avoid deadlock
                resolve();
              }
            });
          };

          // Read loop
          while (true) {
            const { value, done } = await reader!.read();
            if (value && value.length) {
              // if buffer updating, queue it
              if (sourceBuffer!.updating) {
                queue.push(value);
              } else {
                await appendNext(value);
                // flush queue
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
        console.error('MSE fetch error', err);
      }
    };

    initMSE();
    return () => { mounted = false; cleanup(); };
  }, [file.path]);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoop, setIsLoop] = useState(false);

  useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const updateBuffered = () => {
      try {
        if (audio.buffered.length > 0 && audio.duration > 0) {
          const end = audio.buffered.end(audio.buffered.length - 1);
          setBufferedPercent(Math.min(100, Math.round((end / audio.duration) * 100)));
        }
      } catch {}
    };

  audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('progress', updateBuffered);
    audio.addEventListener('ratechange', () => setPlaybackRate(audio.playbackRate));

    // keyboard shortcut: space to toggle play/pause
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKey as any);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('progress', updateBuffered);
      audio.removeEventListener('ratechange', () => setPlaybackRate(audio.playbackRate));
      window.removeEventListener('keydown', handleKey as any);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  const toggleLoop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !audio.loop;
    setIsLoop(audio.loop);
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const downloadUrl = `${API_URL}/api/files/download?path=${encodeURIComponent(file.path)}`;
      const resp = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
      >
        <div className="max-w-4xl mx-auto glass-card p-6">
          <audio
            ref={audioRef}
            preload="metadata"
          />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="text-4xl">🎵</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">{file.name}</h3>
                <p className="text-white/60 text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <input
              aria-label="Seek"
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Play/Pause button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="p-4 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
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
              {/* Playback rate */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={changePlaybackRate}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-all"
                title={`Playback rate: ${playbackRate}x`}
              >
                {playbackRate}x
              </motion.button>

              {/* Loop toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleLoop}
                className={`p-2 rounded-lg ${isLoop ? 'bg-white/30' : 'bg-white/10'} text-white transition-all`}
                title="Toggle loop"
              >
                {isLoop ? '🔁' : '↺'}
              </motion.button>

              {/* Download */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                title="Download"
              >
                ⬇️
              </motion.button>
            </div>

            {/* Volume control */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </motion.button>
              <input
                aria-label="Volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
          {/* Buffered indicator */}
          <div className="mt-2 text-white/60 text-sm">Buffered: {bufferedPercent}%</div>
        </div>
      </motion.div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </AnimatePresence>
  );
}
