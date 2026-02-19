// ─── D1 Database Helpers ────────────────────────────────────────────

// D1Database type for Cloudflare Workers
interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch<T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
}

interface D1Result<T> {
  results: T[];
  success: boolean;
}

export interface DbUser {
  id: string;
  google_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  last_login: string;
}

export interface PlayerStats {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  games_played: number;
  games_won: number;
  total_score: number;
  highest_hand: number;
  total_busts: number;
  total_flip7s: number;
  total_rounds: number;
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
  target_score: number;
  rounds_played: number;
  player_placement: number;
  player_score: number;
  player_count: number;
}

// ─── User Operations ────────────────────────────────────────────────

export async function upsertUser(
  db: D1Database,
  googleId: string,
  email: string,
  displayName: string,
  avatarUrl: string | null
): Promise<DbUser> {
  // Try to find existing user
  const existing = await db
    .prepare('SELECT * FROM users WHERE google_id = ?')
    .bind(googleId)
    .first<DbUser>();

  if (existing) {
    // Update last login and profile
    await db
      .prepare('UPDATE users SET last_login = datetime(\'now\'), display_name = ?, avatar_url = ?, email = ? WHERE id = ?')
      .bind(displayName, avatarUrl, email, existing.id)
      .run();
    return { ...existing, display_name: displayName, avatar_url: avatarUrl, email };
  }

  // Create new user
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO users (id, google_id, email, display_name, avatar_url) VALUES (?, ?, ?, ?, ?)')
    .bind(id, googleId, email, displayName, avatarUrl)
    .run();

  return {
    id,
    google_id: googleId,
    email,
    display_name: displayName,
    avatar_url: avatarUrl,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  };
}

// ─── Game Recording ─────────────────────────────────────────────────

interface GamePlayerData {
  userId: string | null;
  playerName: string;
  playerType: 'human' | 'bot' | 'guest';
  finalScore: number;
  roundsPlayed: number;
  bustCount: number;
  flip7Count: number;
  highestHand: number;
  placement: number;
}

export async function recordGameResult(
  db: D1Database,
  gameType: string,
  roomCode: string,
  targetScore: number,
  roundsPlayed: number,
  winnerUserId: string | null,
  players: GamePlayerData[]
): Promise<void> {
  const gameId = crypto.randomUUID();

  const statements = [
    db
      .prepare('INSERT INTO game_results (id, game_type, room_code, target_score, rounds_played, winner_user_id) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(gameId, gameType, roomCode, targetScore, roundsPlayed, winnerUserId),
    ...players.map((p) =>
      db
        .prepare(
          'INSERT INTO player_results (id, game_id, user_id, player_name, player_type, final_score, rounds_played, bust_count, flip7_count, highest_hand, placement) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          crypto.randomUUID(),
          gameId,
          p.userId,
          p.playerName,
          p.playerType,
          p.finalScore,
          p.roundsPlayed,
          p.bustCount,
          p.flip7Count,
          p.highestHand,
          p.placement
        )
    ),
  ];

  await db.batch(statements);
}

// ─── Stats Queries ──────────────────────────────────────────────────

export async function getPlayerStats(db: D1Database, userId: string, gameType = 'flip7'): Promise<PlayerStats | null> {
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<DbUser>();

  if (!user) return null;

  const stats = await db
    .prepare(`
      SELECT
        COUNT(DISTINCT pr.game_id) as games_played,
        SUM(CASE WHEN pr.placement = 1 THEN 1 ELSE 0 END) as games_won,
        SUM(pr.final_score) as total_score,
        MAX(pr.highest_hand) as highest_hand,
        SUM(pr.bust_count) as total_busts,
        SUM(pr.flip7_count) as total_flip7s,
        SUM(pr.rounds_played) as total_rounds
      FROM player_results pr
      JOIN game_results gr ON gr.id = pr.game_id
      WHERE pr.user_id = ? AND gr.game_type = ?
    `)
    .bind(userId, gameType)
    .first<{
      games_played: number;
      games_won: number;
      total_score: number;
      highest_hand: number;
      total_busts: number;
      total_flip7s: number;
      total_rounds: number;
    }>();

  return {
    user_id: userId,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    games_played: stats?.games_played ?? 0,
    games_won: stats?.games_won ?? 0,
    total_score: stats?.total_score ?? 0,
    highest_hand: stats?.highest_hand ?? 0,
    total_busts: stats?.total_busts ?? 0,
    total_flip7s: stats?.total_flip7s ?? 0,
    total_rounds: stats?.total_rounds ?? 0,
  };
}

export async function getRecentGames(db: D1Database, userId: string, gameType = 'flip7', limit = 10): Promise<RecentGame[]> {
  const result = await db
    .prepare(`
      SELECT
        pr.game_id,
        gr.played_at,
        gr.room_code,
        gr.target_score,
        gr.rounds_played,
        pr.placement as player_placement,
        pr.final_score as player_score,
        (SELECT COUNT(*) FROM player_results pr2 WHERE pr2.game_id = gr.id) as player_count
      FROM player_results pr
      JOIN game_results gr ON gr.id = pr.game_id
      WHERE pr.user_id = ? AND gr.game_type = ?
      ORDER BY gr.played_at DESC
      LIMIT ?
    `)
    .bind(userId, gameType, limit)
    .all<RecentGame>();

  return result.results;
}

// ─── Leaderboard ────────────────────────────────────────────────────

export async function getLeaderboard(
  db: D1Database,
  type: 'wins' | 'highest_hand' | 'win_rate',
  gameType = 'flip7',
  limit = 20
): Promise<LeaderboardEntry[]> {
  let query: string;

  switch (type) {
    case 'wins':
      query = `
        SELECT
          pr.user_id,
          u.display_name,
          u.avatar_url,
          SUM(CASE WHEN pr.placement = 1 THEN 1 ELSE 0 END) as value
        FROM player_results pr
        JOIN users u ON u.id = pr.user_id
        JOIN game_results gr ON gr.id = pr.game_id
        WHERE pr.user_id IS NOT NULL AND gr.game_type = ?
        GROUP BY pr.user_id
        ORDER BY value DESC
        LIMIT ?
      `;
      break;

    case 'highest_hand':
      query = `
        SELECT
          pr.user_id,
          u.display_name,
          u.avatar_url,
          MAX(pr.highest_hand) as value
        FROM player_results pr
        JOIN users u ON u.id = pr.user_id
        JOIN game_results gr ON gr.id = pr.game_id
        WHERE pr.user_id IS NOT NULL AND gr.game_type = ?
        GROUP BY pr.user_id
        ORDER BY value DESC
        LIMIT ?
      `;
      break;

    case 'win_rate':
      query = `
        SELECT
          pr.user_id,
          u.display_name,
          u.avatar_url,
          ROUND(
            CAST(SUM(CASE WHEN pr.placement = 1 THEN 1 ELSE 0 END) AS FLOAT)
            / COUNT(DISTINCT pr.game_id) * 100
          ) as value
        FROM player_results pr
        JOIN users u ON u.id = pr.user_id
        JOIN game_results gr ON gr.id = pr.game_id
        WHERE pr.user_id IS NOT NULL AND gr.game_type = ?
        GROUP BY pr.user_id
        HAVING COUNT(DISTINCT pr.game_id) >= 5
        ORDER BY value DESC
        LIMIT ?
      `;
      break;
  }

  const result = await db.prepare(query).bind(gameType, limit).all<LeaderboardEntry>();
  return result.results;
}
