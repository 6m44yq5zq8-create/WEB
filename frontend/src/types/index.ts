/**
 * TypeScript types for the application
 */

export interface FileInfo {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  modified_time?: string;
  file_type?: string;
}

export interface DirectoryListing {
  path: string;
  items: FileInfo[];
  total: number;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  token: string;
  message: string;
}

export interface User {
  authenticated: boolean;
}
