export type Skill = "deck" | "engine" | "navigation";

export type Stats = Partial<Record<Skill, number>>;

export type CrewCard = {
  id: string;
  name: string;
  cost: number;
  stats: Stats;
  image: string;
};

export type GameEvent = {
  id: string;
  name: string;
  skill: Skill;
  required: number;
  description: string;
  failure: string;
};

export type Combo = {
  ids: [string, string];
  skill: Skill;
  bonus: number;
  name: string;
};

export const CREW_CARDS: CrewCard[] = [
  { id: "deckhand", name: "갑판원", cost: 1, stats: { deck: 2 }, image: "/images/crew/deckhand.png" },
  { id: "boatswain", name: "갑판장", cost: 2, stats: { deck: 4 }, image: "/images/crew/boatswain.png" },
  { id: "engine-rating", name: "기관원", cost: 1, stats: { engine: 2 }, image: "/images/crew/engine-rating.png" },
  { id: "third-officer", name: "3항사", cost: 2, stats: { navigation: 2, deck: 1 }, image: "/images/crew/third-officer.png" },
  { id: "third-engineer", name: "3기사", cost: 2, stats: { engine: 3 }, image: "/images/crew/third-engineer.png" },
  { id: "second-officer", name: "2항사", cost: 3, stats: { navigation: 5 }, image: "/images/crew/second-officer.png" },
  { id: "second-engineer", name: "2기사", cost: 3, stats: { engine: 5 }, image: "/images/crew/second-engineer.png" },
  { id: "chief-officer", name: "1항사", cost: 4, stats: { deck: 4, navigation: 3 }, image: "/images/crew/chief-officer.png" },
  { id: "first-engineer", name: "1기사", cost: 4, stats: { engine: 6 }, image: "/images/crew/first-engineer.png" },
  { id: "captain", name: "선장", cost: 5, stats: { deck: 5, navigation: 7 }, image: "/images/crew/captain.png" },
  { id: "chief-engineer", name: "기관장", cost: 5, stats: { engine: 7 }, image: "/images/crew/chief-engineer.png" },
];

export const EVENTS: GameEvent[] = [
  { id: "deck-flood", name: "갑판 침수", skill: "deck", required: 4, description: "큰 파도가 갑판 위로 철썩!", failure: "파도가 갑판을 덮쳤다!" },
  { id: "cargo-lashing", name: "화물 고박 풀림", skill: "deck", required: 5, description: "화물이 좌우로 덜컹덜컹!", failure: "화물이 위험하게 흔들린다!" },
  { id: "mooring-line", name: "계류줄 절단", skill: "deck", required: 6, description: "팽팽하던 계류줄이 위험해요.", failure: "계류줄이 끊어졌다!" },
  { id: "deck-gear", name: "갑판 장비 고장", skill: "deck", required: 5, description: "윈치가 꼼짝도 하지 않아요.", failure: "갑판 장비가 멈췄다!" },
  { id: "main-engine", name: "주기관 이상", skill: "engine", required: 6, description: "기관실에서 수상한 진동이!", failure: "주기관 출력이 떨어진다!" },
  { id: "generator", name: "발전기 정지", skill: "engine", required: 5, description: "선내 불빛이 깜빡깜빡해요.", failure: "선내 전원이 흔들린다!" },
  { id: "fuel-leak", name: "연료 누출", skill: "engine", required: 4, description: "연료 계통 점검이 필요해요.", failure: "기관실에 연료가 새고 있다!" },
  { id: "coolant", name: "냉각수 경보", skill: "engine", required: 5, description: "온도계 바늘이 쭉쭉 올라가요.", failure: "기관 온도가 빠르게 오른다!" },
  { id: "fog", name: "짙은 안개", skill: "navigation", required: 4, description: "뱃머리 앞이 뿌옇게 가려졌어요.", failure: "앞이 하나도 보이지 않는다!" },
  { id: "typhoon", name: "태풍 접근", skill: "navigation", required: 6, description: "먹구름과 높은 파도가 몰려와요.", failure: "거대한 태풍이 항로를 막았다!" },
  { id: "collision", name: "충돌 위험", skill: "navigation", required: 7, description: "레이더에 빠른 선박이 포착됐어요.", failure: "다른 선박이 빠르게 접근한다!" },
  { id: "off-course", name: "항로 이탈", skill: "navigation", required: 5, description: "예정 항로에서 점점 멀어져요.", failure: "배가 예정 항로를 벗어났다!" },
];

export const COMBOS: Combo[] = [
  { ids: ["deckhand", "boatswain"], skill: "deck", bonus: 2, name: "갑판 찰떡 호흡" },
  { ids: ["engine-rating", "third-engineer"], skill: "engine", bonus: 2, name: "기관실 당직 콤비" },
  { ids: ["third-officer", "second-officer"], skill: "navigation", bonus: 2, name: "항해 당직 팀워크" },
  { ids: ["boatswain", "chief-officer"], skill: "deck", bonus: 2, name: "갑판 지휘 체계" },
];

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function createInitialHand(random = Math.random): string[] {
  return shuffle(CREW_CARDS.map((card) => card.id), random).slice(0, 4);
}

export function drawNextEvent(previousId?: string, random = Math.random): GameEvent {
  const pool = previousId ? EVENTS.filter((event) => event.id !== previousId) : EVENTS;
  return pool[Math.floor(random() * pool.length)] ?? EVENTS[0];
}

export function fillHand(
  currentHand: readonly string[],
  usedThisTurn: readonly string[],
  random = Math.random,
): string[] {
  const used = new Set(usedThisTurn);
  const kept = currentHand.filter((id) => !used.has(id));
  const blocked = new Set([...kept, ...usedThisTurn]);
  const pool = CREW_CARDS.map((card) => card.id).filter((id) => !blocked.has(id));
  return [...kept, ...shuffle(pool, random).slice(0, 4 - kept.length)];
}

export function calculateResponse(
  selectedIds: readonly string[],
  skill: Skill,
): { total: number; comboBonus: number; activeCombos: Combo[] } {
  const selected = new Set(selectedIds);
  const base = CREW_CARDS.filter((card) => selected.has(card.id)).reduce(
    (sum, card) => sum + (card.stats[skill] ?? 0),
    0,
  );
  const activeCombos = COMBOS.filter(
    (combo) => combo.skill === skill && combo.ids.every((id) => selected.has(id)),
  );
  const comboBonus = activeCombos.reduce((sum, combo) => sum + combo.bonus, 0);
  return { total: base + comboBonus, comboBonus, activeCombos };
}

export function scoreResolution({
  success,
  total,
  required,
  comboCount,
}: {
  success: boolean;
  total: number;
  required: number;
  comboCount: number;
}): number {
  if (!success) return 0;
  return 100 + (total === required ? 50 : 0) + (comboCount > 0 ? 30 : 0);
}

export function getTitle(score: number, gameOver = false): string {
  if (gameOver) return "멀미하는 견습생";
  if (score >= 1300) return "전설의 선장";
  if (score >= 1000) return "1항사";
  if (score >= 700) return "3항사";
  return "갑판원";
}
