export type Skill = "deck" | "engine" | "navigation";

export type Stats = Partial<Record<Skill, number>>;

export type CrewCard = {
  id: string;
  name: string;
  cost: number;
  stats: Stats;
  image: string;
  supportMultiplier?: number;
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

export type ResultTier = {
  minSuccesses: number;
  title: string;
  image: string;
  quote: string;
};

export const GAME_RULES = {
  startingHull: 12,
  dutyPoints: 6,
  maxSelected: 3,
  totalTurns: 10,
  failureDamage: 3,
  handSize: 4,
  viableHandRate: 0.75,
  seniorAppearanceRate: 0.67,
  cookAppearanceRate: 0.25,
} as const;

export const RESULT_TIERS: ResultTier[] = [
  { minSuccesses: 10, title: "갈매기도 경례하는 전설의 해남이", image: "/images/crew/captain.png", quote: "갈매기까지 차렷! 완벽한 당직이야!" },
  { minSuccesses: 8, title: "선장님도 찾는 만능 해남이", image: "/images/crew/chief-engineer.png", quote: "갑판도 기관도, 일단 나를 불러!" },
  { minSuccesses: 6, title: "파도와 밀당하는 바다 해결사", image: "/images/crew/second-officer.png", quote: "파도야, 오늘은 내가 한 수 위다!" },
  { minSuccesses: 4, title: "커피로 버티는 당직 요정", image: "/images/crew/third-engineer.png", quote: "커피 한 모금이면 한 당직 더 가능!" },
  { minSuccesses: 2, title: "구명조끼 꽉 맨 갑판 병아리", image: "/images/crew/deckhand.png", quote: "삐약! 그래도 두 번은 막았어요!" },
  { minSuccesses: 0, title: "멀미하는 실습생", image: "/images/crew/engine-rating.png", quote: "잠깐만요… 수평선이 흔들려요…" },
];

export const CREW_CARDS: CrewCard[] = [
  { id: "deckhand", name: "갑판원", cost: 1, stats: { deck: 2 }, image: "/images/crew/deckhand.png" },
  { id: "engine-rating", name: "기관원", cost: 1, stats: { engine: 2 }, image: "/images/crew/engine-rating.png" },
  { id: "third-officer", name: "3항사", cost: 2, stats: { navigation: 2, deck: 1 }, image: "/images/crew/third-officer.png" },
  { id: "third-engineer", name: "3기사", cost: 2, stats: { engine: 3 }, image: "/images/crew/third-engineer.png" },
  { id: "second-officer", name: "2항사", cost: 3, stats: { navigation: 5 }, image: "/images/crew/second-officer.png" },
  { id: "second-engineer", name: "2기사", cost: 3, stats: { engine: 5 }, image: "/images/crew/second-engineer.png" },
  { id: "chief-officer", name: "1항사", cost: 4, stats: { deck: 4, navigation: 3 }, image: "/images/crew/chief-officer.png" },
  { id: "first-engineer", name: "1기사", cost: 4, stats: { engine: 6 }, image: "/images/crew/first-engineer.png" },
  { id: "captain", name: "선장", cost: 5, stats: { deck: 5, navigation: 7 }, image: "/images/crew/captain.png" },
  { id: "chief-engineer", name: "기관장", cost: 5, stats: { engine: 7 }, image: "/images/crew/chief-engineer.png" },
  { id: "cook-chief", name: "조리장", cost: 1, stats: {}, image: "/images/crew/cook-chief.png", supportMultiplier: 1.5 },
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
  { ids: ["deckhand", "chief-officer"], skill: "deck", bonus: 2, name: "갑판 지휘 체계" },
  { ids: ["engine-rating", "third-engineer"], skill: "engine", bonus: 2, name: "기관실 당직 콤비" },
  { ids: ["third-officer", "second-officer"], skill: "navigation", bonus: 2, name: "항해 당직 팀워크" },
];

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function drawNextEvent(previousId?: string, random = Math.random): GameEvent {
  const pool = previousId ? EVENTS.filter((event) => event.id !== previousId) : EVENTS;
  return pool[Math.floor(random() * pool.length)] ?? EVENTS[0];
}

export function drawHandForEvent(
  event: GameEvent,
  restingIds: readonly string[] = [],
  random = Math.random,
): string[] {
  const resting = new Set(restingIds);
  const available = CREW_CARDS.filter((card) => !resting.has(card.id));
  const seniorId = event.skill === "engine" ? "chief-engineer" : "captain";
  const senior = available.find((card) => card.id === seniorId);
  const guaranteeViable = random() < GAME_RULES.viableHandRate;

  // Most hands contain a full solution. The remaining rough hands still
  // contain event-relevant crew so no department is completely mismatched.
  let guaranteed: CrewCard[] = [];
  let seniorFeatured = false;
  if (guaranteeViable && senior && random() < GAME_RULES.seniorAppearanceRate) {
    const helper = available.find(
      (card) => card.id !== senior.id
        && card.id !== "cook-chief"
        && senior.cost + card.cost <= GAME_RULES.dutyPoints
        && evaluateDuty([senior.id, card.id], event).success,
    );
    if (evaluateDuty([senior.id], event).success || helper) {
      guaranteed = helper ? [senior, helper] : [senior];
      seniorFeatured = true;
    }
  }
  if (guaranteeViable && guaranteed.length === 0) {
    const viable: CrewCard[][] = [];
    const search = (start: number, picked: CrewCard[]) => {
      if (picked.length > 0) {
        const cost = picked.reduce((sum, card) => sum + card.cost, 0);
        if (cost <= GAME_RULES.dutyPoints && evaluateDuty(picked.map((card) => card.id), event).success) {
          viable.push([...picked]);
        }
      }
      if (picked.length === GAME_RULES.maxSelected) return;
      for (let index = start; index < available.length; index += 1) {
        const next = available[index];
        if (next.id === "cook-chief" || next.id === seniorId) continue;
        const nextCost = picked.reduce((sum, card) => sum + card.cost, 0) + next.cost;
        if (nextCost <= GAME_RULES.dutyPoints) search(index + 1, [...picked, next]);
      }
    };
    search(0, []);
    if (viable.length > 0) guaranteed = viable[Math.floor(random() * viable.length)] ?? viable[0];
  }

  if (guaranteed.length === 0) {
    const matching = available
      .filter((card) => card.id !== senior?.id && (card.stats[event.skill] ?? 0) > 0)
      .sort((left, right) => (left.stats[event.skill] ?? 0) - (right.stats[event.skill] ?? 0));
    guaranteed = guaranteeViable
      ? shuffle(matching, random).slice(0, Math.min(2, matching.length))
      : matching.slice(0, 1);
  }

  const cook = available.find((card) => card.id === "cook-chief");
  let cookFeatured = false;
  if (
    cook
    && guaranteed.length < GAME_RULES.handSize
    && !guaranteed.some((card) => card.id === cook.id)
    && random() < GAME_RULES.cookAppearanceRate
  ) {
    guaranteed.push(cook);
    cookFeatured = true;
  }

  const guaranteedIds = new Set(guaranteed.map((card) => card.id));
  const candidates = available.filter(
    (card) => !guaranteedIds.has(card.id)
      && (card.id !== cook?.id || cookFeatured)
      && (card.id !== senior?.id || seniorFeatured),
  );
  const preferred = guaranteeViable
    ? candidates
    : candidates.filter((card) => (card.stats[event.skill] ?? 0) === 0);
  const preferredIds = new Set(preferred.map((card) => card.id));
  const overflow = candidates.filter((card) => !preferredIds.has(card.id));
  const remainder = [...shuffle(preferred, random), ...shuffle(overflow, random)];
  return [...guaranteed, ...remainder].slice(0, GAME_RULES.handSize).map((card) => card.id);
}

export function canRespondWithHand(handIds: readonly string[], event: GameEvent): boolean {
  const cards = CREW_CARDS.filter((card) => handIds.includes(card.id));
  const search = (start: number, picked: CrewCard[], cost: number): boolean => {
    if (picked.length > 0 && evaluateDuty(picked.map((card) => card.id), event).success) return true;
    if (picked.length === GAME_RULES.maxSelected) return false;
    for (let index = start; index < cards.length; index += 1) {
      const next = cards[index];
      if (cost + next.cost <= GAME_RULES.dutyPoints && search(index + 1, [...picked, next], cost + next.cost)) {
        return true;
      }
    }
    return false;
  };
  return search(0, [], 0);
}

export function calculateResponse(
  selectedIds: readonly string[],
  skill: Skill,
): { total: number; comboBonus: number; supportBonus: number; supportActive: boolean; activeCombos: Combo[] } {
  const selected = new Set(selectedIds);
  const base = CREW_CARDS.filter((card) => selected.has(card.id)).reduce(
    (sum, card) => sum + (card.stats[skill] ?? 0),
    0,
  );
  const activeCombos = COMBOS.filter(
    (combo) => combo.skill === skill && combo.ids.every((id) => selected.has(id)),
  );
  const comboBonus = activeCombos.reduce((sum, combo) => sum + combo.bonus, 0);
  const beforeSupport = base + comboBonus;
  const supportMultiplier = CREW_CARDS.find(
    (card) => selected.has(card.id) && card.supportMultiplier,
  )?.supportMultiplier;
  const supportActive = Boolean(supportMultiplier && beforeSupport > 0);
  const total = supportActive ? Math.ceil(beforeSupport * supportMultiplier!) : beforeSupport;
  return { total, comboBonus, supportBonus: total - beforeSupport, supportActive, activeCombos };
}

export function evaluateDuty(selectedIds: readonly string[], event: GameEvent) {
  const response = calculateResponse(selectedIds, event.skill);
  return {
    ...response,
    success: response.total >= event.required,
  };
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

export function getResultTier(successes: number): ResultTier {
  const safeSuccesses = Math.max(0, Math.min(GAME_RULES.totalTurns, Math.floor(successes)));
  return RESULT_TIERS.find((tier) => safeSuccesses >= tier.minSuccesses) ?? RESULT_TIERS[RESULT_TIERS.length - 1];
}

export function getTitle(successes: number): string {
  return getResultTier(successes).title;
}
