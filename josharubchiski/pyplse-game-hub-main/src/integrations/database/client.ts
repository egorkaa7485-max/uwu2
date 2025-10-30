// Mock database client for browser compatibility
// This will be replaced with actual MySQL client when moved to backend

// Mock pool
const pool = {
  execute: async () => {
    throw new Error('Database operations are not available in browser environment. Please use a backend API.');
  },
  end: async () => {}
};

// Export pool
export { pool };

// Helper functions for database operations
export const dbHelpers = {
  // Execute a query and return results
  query: async (sql: string, params: any[] = []) => {
    console.warn('Database query attempted in browser environment:', sql);
    throw new Error('Database operations are not available in browser environment. Please use a backend API.');
  },

  // Execute a query that doesn't return results
  run: async (sql: string, params: any[] = []) => {
    console.warn('Database run attempted in browser environment:', sql);
    throw new Error('Database operations are not available in browser environment. Please use a backend API.');
  },

  // Get a single row
  get: async (sql: string, params: any[] = []) => {
    console.warn('Database get attempted in browser environment:', sql);
    throw new Error('Database operations are not available in browser environment. Please use a backend API.');
  },

  // Close database connection pool
  close: async () => {
    console.warn('Database close attempted in browser environment');
  }
};
