/**
 * Configuration constants for the application
 */

// API URL - defaults to 49.232.185.68 in development, can be overridden with env variable
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://49.232.185.68:8000';

// Token storage key
export const TOKEN_KEY = 'cloud_storage_token';
