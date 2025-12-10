/**
 * Utility functions
 */
import { API_URL } from './config';

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date in a readable format
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch {
    return dateString;
  }
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType?: string): string {
  switch (fileType) {
    case 'folder':
      return '📁';
    case 'audio':
      return '🎵';
    case 'video':
      return '🎬';
    case 'image':
      return '🖼️';
    case 'document':
      return '📄';
    case 'archive':
      return '📦';
    case 'code':
      return '💻';
    default:
      return '📄';
  }
}

/**
 * Parse breadcrumb path into navigable segments
 */
export function parseBreadcrumb(path: string): Array<{ name: string; path: string }> {
  if (!path || path === '') {
    return [{ name: 'Home', path: '' }];
  }
  
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Home', path: '' }];
  
  let currentPath = '';
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    breadcrumbs.push({ name: segment, path: currentPath });
  }
  
  return breadcrumbs;
}

/**
 * Get download URL for a file
 */
export function getDownloadUrl(filePath: string): string {
  return `${API_URL}/api/files/download?path=${encodeURIComponent(filePath)}`;
}
