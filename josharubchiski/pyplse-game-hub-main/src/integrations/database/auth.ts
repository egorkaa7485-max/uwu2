// API-based authentication for browser compatibility
// This now calls the backend API instead of direct database access

export interface User {
  id: string;
  username: string;
  avatar_url?: string;
  level: number;
  total_wins: number;
  total_games: number;
  diamonds_won: number;
  diamonds_balance: number;
  created_at: string;
  updated_at: string;
}

export const auth = {
  // Register a new user via API
  async signUp(email: string, password: string, username?: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await fetch('http://localhost:3003/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, error: data.error || 'Ошибка при регистрации' };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error: 'Ошибка при регистрации' };
    }
  },

  // Sign in user via API
  async signIn(email: string, password: string): Promise<{ user: User | null; session: string | null; error: string | null }> {
    try {
      const response = await fetch('http://localhost:3003/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, session: null, error: data.error || 'Ошибка при входе' };
      }

      // Store session in localStorage for simplicity
      if (data.session) {
        localStorage.setItem('session', data.session);
      }

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, session: null, error: 'Ошибка при входе' };
    }
  },

  // Get user by session (simplified for frontend)
  async getUser(sessionId: string): Promise<User | null> {
    try {
      // In a real app, you'd validate the session with the backend
      // For now, we'll just check if session exists in localStorage
      const storedSession = localStorage.getItem('session');
      if (!storedSession || storedSession !== sessionId) {
        return null;
      }

      // You might want to fetch user data from backend here
      // For now, return null as we don't have user data cached
      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },

  // Sign out
  async signOut(sessionId: string): Promise<void> {
    localStorage.removeItem('session');
  },

  // Get profile by user ID via API
  async getProfile(userId: string): Promise<{ data: User | null; error: string | null }> {
    try {
      const response = await fetch(`http://localhost:3003/api/profile/${userId}`);

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error.error || 'Ошибка при получении профиля' };
      }

      const data = await response.json();
      return { data: data.data, error: null };
    } catch (error) {
      console.error('Get profile error:', error);
      return { data: null, error: 'Ошибка при получении профиля' };
    }
  }
};
