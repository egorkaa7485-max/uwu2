import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pyplse_game_hub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database
async function initializeDatabase() {
  try {
    // Create user_auth table for storing passwords
    await pool.execute(`CREATE TABLE IF NOT EXISTS user_auth (
      user_id VARCHAR(255) PRIMARY KEY,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id)
    )`);

    // Create profiles table
    await pool.execute(`CREATE TABLE IF NOT EXISTS profiles (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      avatar_url VARCHAR(500),
      level INT DEFAULT 1,
      total_wins INT DEFAULT 0,
      total_games INT DEFAULT 0,
      diamonds_won INT DEFAULT 0,
      diamonds_balance INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username)
    )`);

    // Create friendships table
    await pool.execute(`CREATE TABLE IF NOT EXISTS friendships (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      friend_id VARCHAR(255) NOT NULL,
      status ENUM('pending', 'accepted', 'rejected') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES profiles(id) ON DELETE CASCADE,
      UNIQUE KEY unique_friendship (user_id, friend_id),
      INDEX idx_user_friend (user_id, friend_id)
    )`);

    // Create game lobbies table
    await pool.execute(`CREATE TABLE IF NOT EXISTS game_lobbies (
      id VARCHAR(255) PRIMARY KEY,
      host_id VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      game_type VARCHAR(50) NOT NULL DEFAULT 'durak',
      max_players INT NOT NULL DEFAULT 4,
      current_players INT NOT NULL DEFAULT 1,
      bet_amount INT NOT NULL DEFAULT 10,
      deck_size INT NOT NULL DEFAULT 36,
      is_throw_in BOOLEAN DEFAULT TRUE,
      is_private BOOLEAN DEFAULT FALSE,
      password VARCHAR(100),
      status ENUM('waiting', 'in_progress', 'finished') NOT NULL DEFAULT 'waiting',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (host_id) REFERENCES profiles(id) ON DELETE CASCADE,
      INDEX idx_host_status (host_id, status)
    )`);

    // Create lobby players table
    await pool.execute(`CREATE TABLE IF NOT EXISTS lobby_players (
      id VARCHAR(255) PRIMARY KEY,
      lobby_id VARCHAR(255) NOT NULL,
      player_id VARCHAR(255) NOT NULL,
      position INT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lobby_id) REFERENCES game_lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE,
      UNIQUE KEY unique_lobby_player (lobby_id, player_id),
      INDEX idx_lobby_player (lobby_id, player_id)
    )`);

    // Create game sessions table
    await pool.execute(`CREATE TABLE IF NOT EXISTS game_sessions (
      id VARCHAR(255) PRIMARY KEY,
      lobby_id VARCHAR(255) NOT NULL,
      current_turn_player_id VARCHAR(255),
      game_state JSON NOT NULL DEFAULT ('{}'),
      trump_suit VARCHAR(10),
      status ENUM('active', 'finished') NOT NULL DEFAULT 'active',
      winner_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP NULL,
      FOREIGN KEY (lobby_id) REFERENCES game_lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (current_turn_player_id) REFERENCES profiles(id),
      FOREIGN KEY (winner_id) REFERENCES profiles(id),
      INDEX idx_lobby_status (lobby_id, status)
    )`);

    // Create chat messages table
    await pool.execute(`CREATE TABLE IF NOT EXISTS chat_messages (
      id VARCHAR(255) PRIMARY KEY,
      lobby_id VARCHAR(255) NOT NULL,
      sender_id VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lobby_id) REFERENCES game_lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
      INDEX idx_lobby_sender (lobby_id, sender_id)
    )`);

    // Create achievements table
    await pool.execute(`CREATE TABLE IF NOT EXISTS achievements (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT NOT NULL,
      icon VARCHAR(100),
      requirement_type VARCHAR(50) NOT NULL,
      requirement_value INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_name (name)
    )`);

    // Create user achievements table
    await pool.execute(`CREATE TABLE IF NOT EXISTS user_achievements (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      achievement_id VARCHAR(255) NOT NULL,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_achievement (user_id, achievement_id),
      INDEX idx_user_achievement (user_id, achievement_id)
    )`);

    // Create game emojis table
    await pool.execute(`CREATE TABLE IF NOT EXISTS game_emojis (
      id VARCHAR(255) PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL,
      player_id VARCHAR(255) NOT NULL,
      emoji_type VARCHAR(50) NOT NULL,
      position_x FLOAT NOT NULL,
      position_y FLOAT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE,
      INDEX idx_session_player (session_id, player_id)
    )`);

    // Insert default achievements
    const achievements = [
      { name: 'Первая победа', description: 'Выиграй свою первую игру', requirement_type: 'wins', requirement_value: 1 },
      { name: 'Опытный игрок', description: 'Выиграй 10 игр', requirement_type: 'wins', requirement_value: 10 },
      { name: 'Мастер дурака', description: 'Выиграй 50 игр', requirement_type: 'wins', requirement_value: 50 },
      { name: 'Легенда', description: 'Выиграй 100 игр', requirement_type: 'wins', requirement_value: 100 },
      { name: 'Богач', description: 'Накопи 1000 бриллиантов', requirement_type: 'diamonds', requirement_value: 1000 },
      { name: 'Миллионер', description: 'Накопи 10000 бриллиантов', requirement_type: 'diamonds', requirement_value: 10000 }
    ];

    for (const achievement of achievements) {
      const [existing] = await pool.execute('SELECT id FROM achievements WHERE name = ?', [achievement.name]);
      if (existing.length === 0) {
        await pool.execute(
          'INSERT INTO achievements (id, name, description, requirement_type, requirement_value) VALUES (?, ?, ?, ?, ?)',
          [Date.now().toString() + Math.random().toString(36).substr(2, 9), achievement.name, achievement.description, achievement.requirement_type, achievement.requirement_value]
        );
      }
    }

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
}

// API Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute('SELECT id FROM profiles WHERE username = ? OR id = ?', [username || email.split('@')[0], email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email или именем уже существует' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = email; // Use email as ID for simplicity
    const finalUsername = username || email.split('@')[0];

    await pool.execute(
      'INSERT INTO profiles (id, username, diamonds_balance) VALUES (?, ?, ?)',
      [userId, finalUsername, 100]
    );

    // Create password record
    await pool.execute(
      'INSERT INTO user_auth (user_id, password_hash) VALUES (?, ?)',
      [userId, hashedPassword]
    );

    const [users] = await pool.execute('SELECT * FROM profiles WHERE id = ?', [userId]);
    const user = users[0];

    res.json({ user, error: null });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const [users] = await pool.execute('SELECT * FROM profiles WHERE id = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Пользователь не найден' });
    }

    const user = users[0];
    const [authRecords] = await pool.execute('SELECT password_hash FROM user_auth WHERE user_id = ?', [email]);
    if (authRecords.length === 0) {
      return res.status(400).json({ error: 'Ошибка аутентификации' });
    }

    const isValidPassword = await bcrypt.compare(password, authRecords[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }

    // Create session (simple implementation)
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

    res.json({ user, session: sessionId, error: null });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [users] = await pool.execute('SELECT * FROM profiles WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ data: users[0], error: null });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
