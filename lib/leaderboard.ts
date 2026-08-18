import { GAME_RULES, getTitle } from "./game.ts";

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 10;

const BLOCKED_WORDS = ["씨발", "시발", "병신", "개새", "좆", "fuck", "sex"];

export type LeaderboardSubmission = {
  nickname: string;
  clientId: string;
  score: number;
  successes: number;
};

export function normalizeNickname(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function validateNickname(value: string): string | null {
  const nickname = normalizeNickname(value);
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`;
  }
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_ ]+$/u.test(nickname)) {
    return "닉네임에는 한글, 영문, 숫자, 공백, 밑줄만 사용할 수 있어요.";
  }
  const folded = nickname.toLowerCase().replace(/\s/g, "");
  if (BLOCKED_WORDS.some((word) => folded.includes(word))) {
    return "다른 친구들도 볼 수 있는 닉네임으로 부탁해요.";
  }
  return null;
}

export function scoreBounds(successes: number) {
  if (successes >= 5) {
    const hullBonus = (GAME_RULES.startingHull - (GAME_RULES.totalTurns - successes) * GAME_RULES.failureDamage) * 50;
    return { min: successes * 100 + hullBonus, max: successes * 180 + hullBonus };
  }
  return { min: successes * 100, max: successes * 180 };
}

export function validateLeaderboardSubmission(input: Partial<LeaderboardSubmission>) {
  const nickname = normalizeNickname(String(input.nickname ?? ""));
  const nicknameError = validateNickname(nickname);
  if (nicknameError) return { ok: false as const, error: nicknameError };

  const clientId = String(input.clientId ?? "");
  if (!/^[A-Za-z0-9-]{16,80}$/.test(clientId)) {
    return { ok: false as const, error: "게임 기기 확인값이 올바르지 않아요." };
  }

  const score = Number(input.score);
  const successes = Number(input.successes);
  if (!Number.isInteger(successes) || successes < 0 || successes > GAME_RULES.totalTurns) {
    return { ok: false as const, error: "성공 횟수가 올바르지 않아요." };
  }
  if (!Number.isInteger(score)) {
    return { ok: false as const, error: "점수가 올바르지 않아요." };
  }
  const bounds = scoreBounds(successes);
  if (score < bounds.min || score > bounds.max) {
    return { ok: false as const, error: "게임 결과와 점수가 일치하지 않아요." };
  }

  return {
    ok: true as const,
    value: { nickname, clientId, score, successes, title: getTitle(successes) },
  };
}
