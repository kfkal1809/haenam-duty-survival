import { ensureLeaderboardSchema } from "../../../db";
import { validateLeaderboardSubmission } from "../../../lib/leaderboard";

type StoredEntry = {
  id: number;
  nickname: string;
  score: number;
  successes: number;
  title: string;
  updated_at: string;
};

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function hashClientId(clientId: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientId));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request) {
  try {
    const d1 = await ensureLeaderboardSchema();
    const requested = Number(new URL(request.url).searchParams.get("limit") ?? 50);
    const limit = Math.max(1, Math.min(100, Number.isFinite(requested) ? Math.floor(requested) : 50));
    const result = await d1.prepare(`SELECT id, nickname, score, successes, title, updated_at
      FROM leaderboard
      ORDER BY score DESC, successes DESC, updated_at ASC, id ASC
      LIMIT ?`).bind(limit).all<StoredEntry>();
    const entries = (result.results ?? []).map((entry, index) => ({
      rank: index + 1,
      nickname: entry.nickname,
      score: entry.score,
      successes: entry.successes,
      title: entry.title,
    }));
    return Response.json({ entries }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const validation = validateLeaderboardSubmission(payload);
    if (!validation.ok) return jsonError(validation.error);

    const { nickname, clientId, score, successes, title } = validation.value;
    const clientHash = await hashClientId(clientId);
    const d1 = await ensureLeaderboardSchema();
    const existing = await d1.prepare(`SELECT id, nickname, score, successes, title, updated_at
      FROM leaderboard WHERE client_hash = ?`).bind(clientHash).first<StoredEntry>();
    const improved = !existing || score > existing.score || (score === existing.score && successes > existing.successes);

    if (!existing) {
      await d1.prepare(`INSERT INTO leaderboard
        (client_hash, nickname, score, successes, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
        .bind(clientHash, nickname, score, successes, title).run();
    } else if (improved) {
      await d1.prepare(`UPDATE leaderboard
        SET nickname = ?, score = ?, successes = ?, title = ?, updated_at = CURRENT_TIMESTAMP
        WHERE client_hash = ?`)
        .bind(nickname, score, successes, title, clientHash).run();
    } else if (nickname !== existing.nickname) {
      await d1.prepare("UPDATE leaderboard SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE client_hash = ?")
        .bind(nickname, clientHash).run();
    }

    const saved = await d1.prepare(`SELECT id, nickname, score, successes, title, updated_at
      FROM leaderboard WHERE client_hash = ?`).bind(clientHash).first<StoredEntry>();
    if (!saved) return jsonError("랭킹 저장에 실패했어요.", 500);
    const rankRow = await d1.prepare(`SELECT COUNT(*) + 1 AS rank FROM leaderboard
      WHERE score > ?
        OR (score = ? AND successes > ?)
        OR (score = ? AND successes = ? AND updated_at < ?)
        OR (score = ? AND successes = ? AND updated_at = ? AND id < ?)`)
      .bind(saved.score, saved.score, saved.successes, saved.score, saved.successes, saved.updated_at, saved.score, saved.successes, saved.updated_at, saved.id)
      .first<{ rank: number }>();

    return Response.json({
      improved,
      rank: Number(rankRow?.rank ?? 1),
      entry: { nickname: saved.nickname, score: saved.score, successes: saved.successes, title: saved.title },
    });
  } catch {
    return jsonError("랭킹 저장에 실패했어요. 잠시 후 다시 시도해 주세요.", 500);
  }
}
