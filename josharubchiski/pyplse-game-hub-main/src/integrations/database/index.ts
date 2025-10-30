import { auth } from './auth';
import { dbHelpers } from './client';

// Database initialization is now handled in the backend
// This file is kept for compatibility but doesn't perform any operations in browser

console.log('Database initialization skipped - running in browser environment');

// Export everything needed
export { auth, dbHelpers };
export type { User } from './auth';
