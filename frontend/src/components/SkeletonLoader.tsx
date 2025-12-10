/**
 * Skeleton loading component
 */
'use client';

export default function SkeletonLoader() {
  return (
    <div className="space-y-4">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="glass-card p-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg skeleton"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded skeleton"></div>
              <div className="h-3 w-1/2 rounded skeleton"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
