
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  total_wins INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  diamonds_won INTEGER DEFAULT 0,
  diamonds_balance INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of"
ON public.friendships FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create game lobbies table (without complex policies first)
CREATE TABLE public.game_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'durak',
  max_players INTEGER NOT NULL DEFAULT 4,
  current_players INTEGER NOT NULL DEFAULT 1,
  bet_amount INTEGER NOT NULL DEFAULT 10,
  deck_size INTEGER NOT NULL DEFAULT 36,
  is_throw_in BOOLEAN DEFAULT true,
  is_private BOOLEAN DEFAULT false,
  password TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.game_lobbies ENABLE ROW LEVEL SECURITY;

-- Create lobby players table
CREATE TABLE public.lobby_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.game_lobbies(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(lobby_id, player_id)
);

ALTER TABLE public.lobby_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lobby players"
ON public.lobby_players FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join lobbies"
ON public.lobby_players FOR INSERT
WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can leave lobbies"
ON public.lobby_players FOR DELETE
USING (auth.uid() = player_id);

-- Now add lobby policies
CREATE POLICY "Anyone can view public lobbies"
ON public.game_lobbies FOR SELECT
USING (is_private = false OR auth.uid() = host_id);

CREATE POLICY "Authenticated users can create lobbies"
ON public.game_lobbies FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their lobby"
ON public.game_lobbies FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "Host can delete their lobby"
ON public.game_lobbies FOR DELETE
USING (auth.uid() = host_id);

-- Create game sessions table
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.game_lobbies(id) ON DELETE CASCADE,
  current_turn_player_id UUID REFERENCES public.profiles(id),
  game_state JSONB NOT NULL DEFAULT '{}',
  trump_suit TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  winner_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sessions"
ON public.game_sessions FOR SELECT
USING (true);

CREATE POLICY "Lobby host can create and update session"
ON public.game_sessions FOR ALL
USING (auth.uid() IN (
  SELECT host_id FROM public.game_lobbies WHERE id = lobby_id
));

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.game_lobbies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages"
ON public.chat_messages FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
ON public.achievements FOR SELECT
USING (true);

-- Create user achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

-- Create emojis table
CREATE TABLE public.game_emojis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji_type TEXT NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.game_emojis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view emojis"
ON public.game_emojis FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can send emojis"
ON public.game_emojis FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, diamonds_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player' || substr(NEW.id::text, 1, 8)),
    100
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_emojis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;

-- Insert default achievements
INSERT INTO public.achievements (name, description, requirement_type, requirement_value) VALUES
('Первая победа', 'Выиграй свою первую игру', 'wins', 1),
('Опытный игрок', 'Выиграй 10 игр', 'wins', 10),
('Мастер дурака', 'Выиграй 50 игр', 'wins', 50),
('Легенда', 'Выиграй 100 игр', 'wins', 100),
('Богач', 'Накопи 1000 бриллиантов', 'diamonds', 1000),
('Миллионер', 'Накопи 10000 бриллиантов', 'diamonds', 10000);
