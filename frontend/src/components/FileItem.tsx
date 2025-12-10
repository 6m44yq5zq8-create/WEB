/**
 * File item component for displaying files and folders
 */
'use client';

import { motion } from 'framer-motion';
import { FileInfo } from '@/types';
import { formatFileSize, formatDate, getFileIcon } from '@/lib/utils';

interface FileItemProps {
  file: FileInfo;
  onOpen: (file: FileInfo) => void;
  onDownload?: (file: FileInfo) => void;
  index: number;
}

export default function FileItem({ file, onOpen, onDownload, index }: FileItemProps) {
  const handleClick = () => {
    onOpen(file);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload && !file.is_directory) {
      onDownload(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="glass-card p-4 cursor-pointer group hover:bg-white/15 transition-all"
    >
      <div className="flex items-center space-x-4">
        {/* Icon */}
        <div className="text-4xl flex-shrink-0">
          {getFileIcon(file.file_type)}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate group-hover:text-white transition-colors">
            {file.name}
          </h3>
          <div className="flex items-center space-x-3 text-sm text-white/60 mt-1">
            {!file.is_directory && file.size && (
              <span>{formatFileSize(file.size)}</span>
            )}
            {file.modified_time && (
              <>
                {!file.is_directory && <span>•</span>}
                <span>{formatDate(file.modified_time)}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {!file.is_directory && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDownload}
            className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            title="Download"
            aria-label={`Download ${file.name}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
