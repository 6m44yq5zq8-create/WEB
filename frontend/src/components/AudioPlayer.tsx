/**
 * Audio player component with liquid glass design
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
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
  const [bufferedEnd, setBufferedEnd] = useState(0);

  // Set up audio source with token authentication
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let mounted = true;

    const setupAudio = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
        if (!token) return;

        // Get a short-lived stream token specific to this file
        const response = await fetch(
          `${API_URL}/api/stream/token?path=${encodeURIComponent(file.path)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (!response.ok) {
          console.error('Failed to get stream token');
          return;
        }

        const { token: streamToken } = await response.json();
        
        if (!mounted) return;

        setCurrentTime(0);
        setDuration(0);
        setBufferedEnd(0);
        setIsPlaying(false);

        // Use the short-lived stream token in the URL
        const audioUrl = `${API_URL}/api/stream/audio?path=${encodeURIComponent(file.path)}&token=${encodeURIComponent(streamToken)}`;
        
        if (audio) {
          audio.src = audioUrl;
          audio.load();
        }
      } catch (err) {
        console.error('Error setting up audio:', err);
      }
    };

    setupAudio();

    return () => {
      mounted = false;
    };
  }, [file.path]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoop, setIsLoop] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Named handlers so removeEventListener works correctly
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const updateBuffer = () => {
      if (audio.buffered.length > 0) {
        const bufferedTime = audio.buffered.end(audio.buffered.length - 1);
        setBufferedEnd(bufferedTime);
      } else {
        setBufferedEnd(0);
      }
    };
    const handleEnded = () => setIsPlaying(false);
    const handleRateChange = () => setPlaybackRate(audio.playbackRate);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('progress', updateBuffer);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('ratechange', handleRateChange);

    updateBuffer();

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
  audio.removeEventListener('progress', updateBuffer);
  audio.removeEventListener('ended', handleEnded);
  audio.removeEventListener('ratechange', handleRateChange);
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

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
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
    setPlaybackRate((prev) => {
      const currentIndex = rates.indexOf(prev);
      const nextRate = rates[(currentIndex + 1) % rates.length] ?? rates[0];
      if (audioRef.current) audioRef.current.playbackRate = nextRate;
      return nextRate;
    });
  };

  const toggleLoop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !audio.loop;
    setIsLoop(audio.loop);
  };

  // Keep audio element in sync when playbackRate or isLoop state changes elsewhere
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = isLoop;
  }, [isLoop]);

  const bufferPercent = duration ? Math.min(100, (bufferedEnd / duration) * 100) : 0;
  const volumePercent = Math.round((isMuted ? 0 : volume) * 100);

  const formatTime = (time: number) => {
    if (!isFinite(time) || time <= 0) return '0:00';
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
            <div className="relative h-6">
              {/* Visual track centered inside a taller container so thumb aligns */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-white/10" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-white/30 transition-[width] duration-200 buffered-bar" />
              <input
                aria-label="Seek"
                type="range"
                min="0"
                max={duration || 0}
                value={Math.min(currentTime, duration || 0)}
                onChange={handleSeek}
                className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer slider"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
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
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all min-w-[48px]"
                title={`Playback rate: ${playbackRate}x`}
              >
                {playbackRate}x
              </motion.button>

              {/* Loop toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleLoop}
                className={`p-2 rounded-lg ${isLoop ? 'bg-white/30' : 'bg-white/10'} hover:bg-white/20 text-white transition-all`}
                title="Toggle loop"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
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
              <div className="relative w-24 h-6">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-white/10" />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-white/30 transition-[width] duration-200 volume-filled"
                />
                <input
                  aria-label="Volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer slider"
                />
              </div>
            </div>
          </div>
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

        .slider {
          height: 100%;
        }

        .slider::-webkit-slider-runnable-track {
          height: 2px;
          background: transparent;
        }

        .slider::-moz-range-track {
          height: 2px;
          background: transparent;
        }

        .slider:focus {
          outline: none;
        }

        .buffered-bar {
          width: ${bufferPercent}%;
        }

        .volume-filled {
          width: ${volumePercent}%;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          margin-top: -7px; /* centers thumb over a 2px track */
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transform: translateY(0); /* Firefox centers thumb automatically */
        }
      `}</style>
    </AnimatePresence>
  );
}
