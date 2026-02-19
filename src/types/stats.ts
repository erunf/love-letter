// Types for stats and leaderboard API responses

export interface PlayerStats {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  games_played: number;
  games_won: number;
  total_rounds_won: number;
  total_rounds_played: number;
  total_eliminations: number;
  total_spy_bonuses: number;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  value: number;
}

export interface RecentGame {
  game_id: string;
  played_at: string;
  room_code: string;
  rounds_played: number;
  player_placement: number;
  player_tokens: number;
  player_count: number;
}
