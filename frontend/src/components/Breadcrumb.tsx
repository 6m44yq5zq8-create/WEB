/**
 * Breadcrumb navigation component
 */
'use client';

import { motion } from 'framer-motion';
import { parseBreadcrumb } from '@/lib/utils';

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export default function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const breadcrumbs = parseBreadcrumb(path);

  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
      {breadcrumbs.map((crumb, index) => (
        <motion.div
          key={crumb.path}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center space-x-2"
        >
          <button
            onClick={() => onNavigate(crumb.path)}
            className={`px-3 py-1 rounded-lg transition-all ${
              index === breadcrumbs.length - 1
                ? 'bg-white/20 text-white font-semibold'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {crumb.name}
          </button>
          {index < breadcrumbs.length - 1 && (
            <span className="text-white/50">/</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
