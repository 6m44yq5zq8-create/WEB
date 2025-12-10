'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { FileInfo, DirectoryListing } from '@/types';
import { getDownloadUrl } from '@/lib/utils';
import Breadcrumb from '@/components/Breadcrumb';
import FileItem from '@/components/FileItem';
import SkeletonLoader from '@/components/SkeletonLoader';
import AudioPlayer from '@/components/AudioPlayer';
import VideoPlayer from '@/components/VideoPlayer';
import { apiClient } from '@/lib/api';
import { base64urlToBuffer, bufferToBase64url } from '@/lib/webauthn';

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified'>('name');
  
  const [audioFile, setAudioFile] = useState<FileInfo | null>(null);
  const [videoFile, setVideoFile] = useState<FileInfo | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadFiles();
    }
  }, [currentPath, sortBy, searchQuery, isAuthenticated]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const params: any = {
        path: currentPath,
        sort_by: sortBy,
      };
      
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await apiClient.get<DirectoryListing>('/api/files/list', { params });
      setFiles(response.data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSearchQuery('');
  };

  const handleFileOpen = (file: FileInfo) => {
    if (file.is_directory) {
      setCurrentPath(file.path);
    } else {
      // Open media player based on file type
      if (file.file_type === 'audio') {
        setAudioFile(file);
      } else if (file.file_type === 'video') {
        setVideoFile(file);
      } else {
        // Download other files
        handleDownload(file);
      }
    }
  };

  const handleDownload = async (file: FileInfo) => {
    try {
      const token = localStorage.getItem('cloud_storage_token');
      const url = getDownloadUrl(file.path);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      
      // Add authorization header via fetch
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">☁️</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Personal Cloud Storage
              </h1>
              <p className="text-white/70 text-sm">
                Your files, anywhere, anytime
              </p>
            </div>
          </div>
          
          <motion.div className="flex items-center space-x-3">
            <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="glass-button text-white text-sm"
          >
            Logout
          </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                try {
                  // check secure context
                  if (!window.PublicKeyCredential || !(window.isSecureContext || window.location.hostname === 'localhost')) {
                    alert('Passkey registration requires a secure context (https) or localhost.');
                    return;
                  }
                  const res = await apiClient.get('/api/auth/passkey/register/options');
                  const opts = res.data;
                  if (!opts || !opts.challenge) {
                    alert('Cannot create Passkey: registration not allowed or server returned no options.');
                    return;
                  }
                  const publicKey: any = {
                    ...opts,
                    challenge: base64urlToBuffer(opts.challenge),
                    user: {
                      ...opts.user,
                      id: base64urlToBuffer(opts.user.id)
                    }
                  };
                  if (opts.excludeCredentials && Array.isArray(opts.excludeCredentials)) {
                    publicKey.excludeCredentials = opts.excludeCredentials.map((c: any) => ({ ...c, id: base64urlToBuffer(c.id) }));
                  }
                  const cred: any = await navigator.credentials.create({ publicKey });
                  const clientDataJSON = bufferToBase64url(cred.response.clientDataJSON);
                  const attestationObject = bufferToBase64url((cred as any).response.attestationObject);
                  const rawId = bufferToBase64url(cred.rawId);
                  await apiClient.post('/api/auth/passkey/register/verify', {
                    id: cred.id,
                    rawId,
                    type: cred.type,
                    response: { clientDataJSON, attestationObject }
                  });
                  alert('Passkey created successfully.');
                } catch (err: any) {
                  console.error('Create passkey failed:', err);
                  alert('Passkey creation failed: ' + (err?.response?.data?.detail || err?.message || 'unknown'));
                }
              }}
              className="glass-button text-white text-sm"
            >
              Create Passkey
            </motion.button>
          </motion.div>
        </div>

        {/* Breadcrumb */}
        <Breadcrumb path={currentPath} onNavigate={handleNavigate} />
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 mb-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-xl transition-all"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <span className="text-white/70 text-sm">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-xl transition-all cursor-pointer"
            >
              <option value="name" className="bg-gray-800">Name</option>
              <option value="size" className="bg-gray-800">Size</option>
              <option value="modified" className="bg-gray-800">Modified</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* File list */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <SkeletonLoader />
        ) : error ? (
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
            <p className="text-white/70">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadFiles}
              className="glass-button text-white mt-4"
            >
              Try Again
            </motion.button>
          </div>
        ) : files.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">📂</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'No results found' : 'Folder is empty'}
            </h3>
            <p className="text-white/70">
              {searchQuery ? `No files match "${searchQuery}"` : 'This folder contains no files or folders'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {files.map((file, index) => (
              <FileItem
                key={file.path}
                file={file}
                onOpen={handleFileOpen}
                onDownload={handleDownload}
                index={index}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Media players */}
      {audioFile && (
        <AudioPlayer
          file={audioFile}
          onClose={() => setAudioFile(null)}
        />
      )}

      {videoFile && (
        <VideoPlayer
          file={videoFile}
          onClose={() => setVideoFile(null)}
        />
      )}
    </div>
  );
}
