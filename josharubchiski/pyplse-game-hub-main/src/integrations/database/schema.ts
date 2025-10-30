import { dbHelpers } from './client';

// Initialize database schema
export const initializeDatabase = async () => {
  try {
    // Create user_auth table for storing passwords
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS user_auth (
      user_id VARCHAR(255) PRIMARY KEY,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    )`);

    // Create profiles table
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS profiles (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      avatar_url VARCHAR(500),
      level INT DEFAULT 1,
      total_wins INT DEFAULT 0,
      total_games INT DEFAULT 0,
      diamonds_won INT DEFAULT 0,
      diamonds_balance INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    // Create friendships table
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS friendships (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      friend_id VARCHAR(255) NOT NULL,
      status ENUM('pending', 'accepted', 'rejected') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES profiles(id) ON DELETE CASCADE,
      UNIQUE KEY unique_friendship (user_id, friend_id)
    )`);

    // Create game lobbies table
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS game_lobbies (
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
      FOREIGN KEY (host_id) REFERENCES profiles(id) ON DELETE CASCADE
    )`);

    // Create lobby players table
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS lobby_players (
      id VARCHAR(255) PRIMARY KEY,
      lobby_id VARCHAR(255) NOT NULL,
      player_id VARCHAR(255) NOT NULL,
      position INT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lobby_id) REFERENCES game_lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE,
      UNIQUE KEY unique_lobby_player (lobby_id, player_id)
    )`);

    // Create game sessions table
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS game_sessions (
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
      FOREIGN KEY (winner_id) REFERENCES profiles(id)
    )`);

    // Create chat messages table
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS chat_messages (
      id VARCHAR(255) PRIMARY KEY,
      lobby_id VARCHAR(255) NOT NULL,
      sender_id VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lobby_id) REFERENCES game_lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE
    )`);

    // Create achievements table
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS achievements (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT NOT NULL,
      icon VARCHAR(100),
      requirement_type VARCHAR(50) NOT NULL,
      requirement_value INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create user achievements table
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS user_achievements (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      achievement_id VARCHAR(255) NOT NULL,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_achievement (user_id, achievement_id)
    )`);

    // Create game emojis table
    await dbHelpers.run(`CREATE TABLE IF NOT EXISTS game_emojis (
      id VARCHAR(255) PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL,
      player_id VARCHAR(255) NOT NULL,
      emoji_type VARCHAR(50) NOT NULL,
      position_x FLOAT NOT NULL,
      position_y FLOAT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE
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
      const existing = await dbHelpers.get('SELECT id FROM achievements WHERE name = ?', [achievement.name]);
      if (!existing) {
        await dbHelpers.run(
          'INSERT INTO achievements (id, name, description, requirement_type, requirement_value) VALUES (?, ?, ?, ?, ?)',
          [Date.now().toString() + Math.random().toString(36).substr(2, 9), achievement.name, achievement.description, achievement.requirement_type, achievement.requirement_value]
        );
      }
    }

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
};
