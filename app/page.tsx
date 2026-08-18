"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  CREW_CARDS,
  GAME_RULES,
  canRespondWithHand,
  drawHandForEvent,
  drawNextEvent,
  evaluateDuty,
  getResultTier,
  scoreResolution,
  type CrewCard,
  type GameEvent,
  type Skill,
} from "../lib/game";
import { NICKNAME_MAX, normalizeNickname, validateNickname } from "../lib/leaderboard";

type Screen = "start" | "game" | "result";
type GameState = {
  turn: number;
  hull: number;
  score: number;
  hand: string[];
  selected: string[];
  event: GameEvent;
  successes: number;
  bestCombo: number;
};
type Outcome = {
  success: boolean;
  points: number;
  total: number;
  combos: string[];
  supportBonus: number;
  terminal: boolean;
};
type Result = {
  won: boolean;
  score: number;
  hull: number;
  successes: number;
  bestCombo: number;
  title: string;
  image: string;
  quote: string;
};
type LeaderboardEntry = {
  rank: number;
  nickname: string;
  score: number;
  successes: number;
  title: string;
};
type RankingStatus = "idle" | "loading" | "saving" | "saved" | "error";

const STORAGE = {
  highScore: "haenam-duty-high-score",
  highTitle: "haenam-duty-high-title",
  sound: "haenam-duty-sound",
  nickname: "haenam-duty-nickname",
  clientId: "haenam-duty-client-id",
};
const EVENT_META = {
  deck: { label: "갑판", icon: "⚓", color: "coral" },
  engine: { label: "기관", icon: "⚙", color: "gold" },
  navigation: { label: "항해", icon: "✦", color: "blue" },
} as const;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("start");
  const [showHelp, setShowHelp] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [highTitle, setHighTitle] = useState("첫 당직 대기 중");
  const [soundOn, setSoundOn] = useState(true);
  const [notice, setNotice] = useState("");
  const [nickname, setNickname] = useState("");
  const [clientId, setClientId] = useState("");
  const [showRanking, setShowRanking] = useState(false);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [rankingStatus, setRankingStatus] = useState<RankingStatus>("idle");
  const [rankingError, setRankingError] = useState("");
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedScore = Number(localStorage.getItem(STORAGE.highScore) ?? 0);
      setHighScore(Number.isFinite(savedScore) ? savedScore : 0);
      setHighTitle(localStorage.getItem(STORAGE.highTitle) || "첫 당직 대기 중");
      setSoundOn(localStorage.getItem(STORAGE.sound) !== "off");
      setNickname(localStorage.getItem(STORAGE.nickname) || "");
      const savedClientId = localStorage.getItem(STORAGE.clientId);
      const nextClientId = savedClientId || (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
      setClientId(nextClientId);
      localStorage.setItem(STORAGE.clientId, nextClientId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedCards = useMemo(
    () => game ? game.selected.map((id) => CREW_CARDS.find((card) => card.id === id)).filter((card): card is CrewCard => Boolean(card)) : [],
    [game],
  );
  const response = useMemo(
    () => game ? evaluateDuty(game.selected, game.event) : { total: 0, comboBonus: 0, supportBonus: 0, supportActive: false, activeCombos: [], success: false },
    [game],
  );
  const spent = selectedCards.reduce((sum, card) => sum + card.cost, 0);
  const nicknameError = nickname ? validateNickname(nickname) : "닉네임을 입력해 주세요.";

  function playTone(kind: "click" | "success" | "fail" | "win") {
    if (!soundOn || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = { click: 440, success: 660, fail: 190, win: 880 }[kind];
      oscillator.type = kind === "fail" ? "sawtooth" : "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
      oscillator.addEventListener("ended", () => void context.close());
    } catch {
      // Optional audio must never interrupt play.
    }
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(STORAGE.sound, next ? "on" : "off");
  }

  function updateNickname(value: string) {
    setNickname(value);
    localStorage.setItem(STORAGE.nickname, value);
  }

  async function fetchRankingEntries() {
    const response = await fetch("/api/leaderboard?limit=50", { cache: "no-store" });
    const payload = await response.json() as { entries?: LeaderboardEntry[]; error?: string };
    if (!response.ok) throw new Error(payload.error || "랭킹을 불러오지 못했어요.");
    setRankings(payload.entries ?? []);
  }

  async function openRanking() {
    setShowRanking(true);
    setRankingStatus("loading");
    setRankingError("");
    try {
      await fetchRankingEntries();
      setRankingStatus("idle");
    } catch (error) {
      setRankingError(error instanceof Error ? error.message : "랭킹을 불러오지 못했어요.");
      setRankingStatus("error");
    }
  }

  async function submitScore(finalScore: number, successes: number) {
    setRankingStatus("saving");
    setRankingError("");
    try {
      const response = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: normalizeNickname(nickname), clientId, score: finalScore, successes }),
      });
      const payload = await response.json() as { rank?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "랭킹 저장에 실패했어요.");
      setMyRank(Number(payload.rank ?? 1));
      setRankingStatus("saved");
      await fetchRankingEntries();
    } catch (error) {
      setRankingError(error instanceof Error ? error.message : "랭킹 저장에 실패했어요.");
      setRankingStatus("error");
    }
  }

  function startGame() {
    const error = validateNickname(nickname);
    if (error || !clientId) return;
    const cleanNickname = normalizeNickname(nickname);
    setNickname(cleanNickname);
    localStorage.setItem(STORAGE.nickname, cleanNickname);
    playTone("click");
    const event = drawNextEvent();
    setGame({ turn: 1, hull: GAME_RULES.startingHull, score: 0, hand: drawHandForEvent(event), selected: [], event, successes: 0, bestCombo: 0 });
    setOutcome(null);
    setResult(null);
    setNotice("");
    setMyRank(null);
    setRankingStatus("idle");
    setRankingError("");
    setScreen("game");
  }

  function toggleCard(card: CrewCard) {
    if (!game || outcome) return;
    playTone("click");
    if (game.selected.includes(card.id)) {
      setGame({ ...game, selected: game.selected.filter((id) => id !== card.id) });
      setNotice("");
      return;
    }
    if (game.selected.length >= GAME_RULES.maxSelected) return setNotice(`한 번에 최대 ${GAME_RULES.maxSelected}명까지 배치할 수 있어요!`);
    if (spent + card.cost > GAME_RULES.dutyPoints) return setNotice("당직 포인트가 부족해요!");
    setGame({ ...game, selected: [...game.selected, card.id] });
    setNotice("");
  }

  function resolveTurn() {
    if (!game || outcome) return;
    if (game.selected.length === 0) return setNotice("대응할 해남이를 먼저 선택해 주세요!");
    // Use the exact evaluation already shown on screen so display and result
    // can never diverge at the success boundary.
    const current = response;
    const success = current.success;
    const points = scoreResolution({ success, total: current.total, required: game.event.required, comboCount: current.activeCombos.length });
    const hull = success ? game.hull : Math.max(0, game.hull - GAME_RULES.failureDamage);
    const terminal = hull === 0 || game.turn === GAME_RULES.totalTurns;
    setGame({
      ...game,
      hull,
      score: game.score + points,
      successes: game.successes + (success ? 1 : 0),
      bestCombo: Math.max(game.bestCombo, current.activeCombos.length),
    });
    setOutcome({ success, points, total: current.total, combos: current.activeCombos.map((combo) => combo.name), supportBonus: current.supportBonus, terminal });
    setNotice("");
    playTone(success ? (terminal && hull > 0 ? "win" : "success") : "fail");
  }

  function continueGame() {
    if (!game || !outcome) return;
    if (outcome.terminal) {
      const won = game.hull > 0 && game.turn === GAME_RULES.totalTurns;
      const finalScore = game.score + (won ? game.hull * 50 : 0);
      const tier = getResultTier(game.successes);
      setResult({ won, score: finalScore, hull: game.hull, successes: game.successes, bestCombo: game.bestCombo, title: tier.title, image: tier.image, quote: tier.quote });
      setScreen("result");
      setOutcome(null);
      if (finalScore > highScore) {
        setHighScore(finalScore);
        setHighTitle(tier.title);
        localStorage.setItem(STORAGE.highScore, String(finalScore));
        localStorage.setItem(STORAGE.highTitle, tier.title);
      }
      void submitScore(finalScore, game.successes);
      return;
    }
    const nextEvent = drawNextEvent(game.event.id);
    setGame({ ...game, turn: game.turn + 1, hand: drawHandForEvent(nextEvent, game.selected), selected: [], event: nextEvent });
    setOutcome(null);
  }

  return (
    <main className="site-shell">
      <div className="ocean-decor ocean-decor-one" aria-hidden="true" />
      <div className="ocean-decor ocean-decor-two" aria-hidden="true" />
      <section className="phone-frame" aria-live="polite">
        {screen === "start" && <StartScreen highScore={highScore} highTitle={highTitle} nickname={nickname} nicknameError={nicknameError} ready={Boolean(clientId)} soundOn={soundOn} onNickname={updateNickname} onSound={toggleSound} onStart={startGame} onHelp={() => setShowHelp(true)} onRanking={openRanking} />}
        {screen === "game" && game && <GameScreen game={game} spent={spent} selectedCards={selectedCards} total={response.total} ready={response.success} comboNames={response.activeCombos.map((combo) => combo.name)} supportActive={response.supportActive} notice={notice} soundOn={soundOn} outcome={outcome} onSound={toggleSound} onToggleCard={toggleCard} onResolve={resolveTurn} onContinue={continueGame} />}
        {screen === "result" && result && <ResultScreen result={result} highScore={highScore} nickname={nickname} myRank={myRank} rankingStatus={rankingStatus} rankingError={rankingError} onRanking={openRanking} onRestart={startGame} onHome={() => setScreen("start")} />}
      </section>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showRanking && <RankingModal entries={rankings} status={rankingStatus} error={rankingError} onRefresh={openRanking} onClose={() => setShowRanking(false)} />}
    </main>
  );
}

function StartScreen({ highScore, highTitle, nickname, nicknameError, ready, soundOn, onNickname, onSound, onStart, onHelp, onRanking }: { highScore: number; highTitle: string; nickname: string; nicknameError: string | null; ready: boolean; soundOn: boolean; onNickname: (value: string) => void; onSound: () => void; onStart: () => void; onHelp: () => void; onRanking: () => void }) {
  return (
    <div className="start-screen screen-panel">
      <button className="sound-button" onClick={onSound} aria-label="사운드 전환">{soundOn ? "♪ ON" : "♪ OFF"}</button>
      <div className="brand-kicker">해기사와 연인들의 항해일지 · MINI GAME</div>
      <div className="logo-mark" aria-hidden="true"><span>⚓</span></div>
      <h1>해남이의<strong>당직에서 살아남기</strong></h1>
      <p className="start-copy">직급 카드를 알맞게 배치해<br />열 번의 파란만장한 당직을 버텨보세요!</p>
      <div className="hero-scene" aria-label="항해사와 기관사 해남이">
        <span className="cloud cloud-left">☁</span><span className="cloud cloud-right">☁</span>
        <img src="/images/crew/hero-duo.png" alt="항해사와 기관사 해남이 캐릭터" />
        <div className="wave-row">⌁ ⌁ ⌁ ⌁ ⌁</div>
      </div>
      <label className="nickname-box"><span>랭킹에 남길 닉네임</span><input value={nickname} maxLength={NICKNAME_MAX} onChange={(event) => onNickname(event.target.value)} placeholder="예: 부산해적왕" aria-invalid={Boolean(nicknameError)} /><small className={nicknameError ? "error" : ""}>{nicknameError || "게임이 끝나면 전체 랭킹에 최고 기록이 저장돼요."}</small></label>
      <div className="best-card"><span>나의 최고 기록</span><strong>{highScore.toLocaleString()}점</strong><em>{highTitle}</em></div>
      <div className="start-actions">
        <button className="primary-button" onClick={onStart} disabled={Boolean(nicknameError) || !ready}><span>⚓</span> 당직 시작</button>
        <div className="secondary-row"><button className="secondary-button" onClick={onRanking}>전체 랭킹</button><button className="secondary-button" onClick={onHelp}>게임 방법</button></div>
      </div>
    </div>
  );
}

function GameScreen({ game, spent, selectedCards, total, ready, comboNames, supportActive, notice, soundOn, outcome, onSound, onToggleCard, onResolve, onContinue }: { game: GameState; spent: number; selectedCards: CrewCard[]; total: number; ready: boolean; comboNames: string[]; supportActive: boolean; notice: string; soundOn: boolean; outcome: Outcome | null; onSound: () => void; onToggleCard: (card: CrewCard) => void; onResolve: () => void; onContinue: () => void }) {
  const meta = EVENT_META[game.event.skill];
  const handViable = canRespondWithHand(game.hand, game.event);
  return (
    <div className="game-screen screen-panel">
      <header className="game-header">
        <div className="turn-badge"><span>당직</span><strong>{game.turn}/{GAME_RULES.totalTurns}</strong></div>
        <div className="header-stat"><span>선박 내구도</span><strong>{"♥".repeat(Math.ceil(game.hull / 2))}</strong></div>
        <div className="header-stat score-stat"><span>점수</span><strong>{game.score}</strong></div>
        <button className="mini-sound" onClick={onSound} aria-label="사운드 전환">{soundOn ? "♪" : "×"}</button>
      </header>
      <div className="sea-window" aria-hidden="true"><span className="sun">☀</span><span className="sea-cloud one">☁</span><span className="sea-cloud two">☁</span><span className="ship">▰<i>▥</i></span><div className="sea-lines">⌁⌁⌁⌁⌁⌁⌁</div></div>
      <article className={`event-card ${meta.color}`}>
        <div className="event-icon">{meta.icon}</div>
        <div className="event-copy"><span>{meta.label} 비상상황</span><h2>{game.event.name}</h2><p>{game.event.description}</p></div>
        <div className="requirement"><span>요구</span><strong>{game.event.required}</strong></div>
      </article>
      <section className="deployment-zone">
        <div className="zone-title"><span>선택한 해남이</span><span className={ready ? "ready" : ""}>{meta.label} 대응력 {total}/{game.event.required}</span></div>
        <div className="selected-row">
          {selectedCards.length === 0 ? <p>아래 카드에서 1~3명을 선택하세요</p> : selectedCards.map((card) => <button key={card.id} onClick={() => onToggleCard(card)}><img src={card.image} alt="" /><span>{card.name}</span></button>)}
        </div>
        {(comboNames.length > 0 || supportActive) && <div className="combo-ribbon">✦ {[...comboNames, ...(supportActive ? ["조리장 응원 ×1.5"] : [])].join(" · ")} 발동!</div>}
      </section>
      <section className="hand-section">
        <div className="hand-heading"><strong>손패 <em className={handViable ? "" : "rough"}>{handViable ? "사건 맞춤" : "거친 당직"}</em></strong><span>당직 포인트 <b>{GAME_RULES.dutyPoints - spent}</b>/{GAME_RULES.dutyPoints}</span></div>
        <div className="hand-grid">
          {game.hand.map((id) => {
            const card = CREW_CARDS.find((item) => item.id === id)!;
            const selected = game.selected.includes(card.id);
            return <CrewCardButton key={card.id} card={card} activeSkill={game.event.skill} activeLabel={meta.label} selected={selected} disabled={Boolean(outcome) || (!selected && spent + card.cost > GAME_RULES.dutyPoints)} onClick={() => onToggleCard(card)} />;
          })}
        </div>
      </section>
      <div className="action-area">
        <p className="notice">{notice || (handViable ? `${meta.label} 수치만 합산돼요 · 카드 아래 기여도를 확인하세요` : "거친 당직! 요구치를 못 채워도 최선의 카드를 골라보세요")}</p>
        <button className="primary-button respond-button" onClick={onResolve} disabled={Boolean(outcome)}>대응하기 <span>›</span></button>
      </div>
      {outcome && <div className={`outcome-layer ${outcome.success ? "success" : "failure"}`}><div className="outcome-card">
        <div className="outcome-face">{outcome.success ? "(•ᴗ•)و" : "(×﹏×)"}</div>
        <span>{outcome.success ? "대응 성공!" : "우당탕! 대응 실패"}</span>
        <h2>{outcome.success ? `+${outcome.points}점 획득` : game.event.failure}</h2>
        <p>{meta.label} 대응력 {outcome.total} · 요구치 {game.event.required}</p>
        {(outcome.combos.length > 0 || outcome.supportBonus > 0) && <em>{outcome.combos.length > 0 ? `협동 보너스: ${outcome.combos.join(", ")}` : ""}{outcome.combos.length > 0 && outcome.supportBonus > 0 ? " · " : ""}{outcome.supportBonus > 0 ? `조리장 지원 +${outcome.supportBonus}` : ""}</em>}
        <button className="primary-button" onClick={onContinue}>{outcome.terminal ? "결과 확인" : "다음 당직"}</button>
      </div></div>}
    </div>
  );
}

function CrewCardButton({ card, activeSkill, activeLabel, selected, disabled, onClick }: { card: CrewCard; activeSkill: Skill; activeLabel: string; selected: boolean; disabled: boolean; onClick: () => void }) {
  const contribution = card.stats[activeSkill] ?? 0;
  const isSupport = Boolean(card.supportMultiplier);
  const contributionLabel = isSupport ? `지원 ×${card.supportMultiplier}` : `이번 ${activeLabel} +${contribution}`;
  return <button className={`crew-card ${selected ? "selected" : ""} ${contribution === 0 && !isSupport ? "irrelevant" : ""} ${isSupport ? "support" : ""}`} disabled={disabled} onClick={onClick} aria-pressed={selected} aria-label={`${card.name}, ${contributionLabel}`}>
    <span className="cost-badge">{card.cost}</span>{selected && <span className="check-badge">✓</span>}
    <div className="crew-image-wrap"><img src={card.image} alt={`${card.name} 캐릭터`} /></div>
    <strong>{card.name}</strong><small className={contribution === 0 && !isSupport ? "zero" : ""}>{contributionLabel}</small>
  </button>;
}

function ResultScreen({ result, highScore, nickname, myRank, rankingStatus, rankingError, onRanking, onRestart, onHome }: { result: Result; highScore: number; nickname: string; myRank: number | null; rankingStatus: RankingStatus; rankingError: string; onRanking: () => void; onRestart: () => void; onHome: () => void }) {
  return <div className={`result-screen screen-panel ${result.won ? "won" : "lost"}`}>
    <div className="result-confetti" aria-hidden="true">✦　⚓　✦</div>
    <span className="result-kicker">{result.won ? "목적지 도착!" : "선박 내구도 0"}</span>
    <h1>{result.won ? "당직 생존 성공" : "오늘은 여기까지!"}</h1>
    <p>{result.won ? "열 번의 당직을 무사히 버텨냈어요." : "해남이들이 배를 수리하러 총출동했어요."}</p>
    <div className="result-character"><img src={result.image} alt={`${result.title} 캐릭터`} /><span>{result.quote}</span></div>
    <div className="title-medal"><span>획득 칭호</span><strong>{result.title}</strong></div>
    <div className="result-score"><span>최종 점수</span><strong>{result.score.toLocaleString()}</strong>{result.score === highScore && result.score > 0 && <em>BEST!</em>}</div>
    <div className="result-stats"><div><span>남은 내구도</span><strong>{result.hull}</strong></div><div><span>성공 횟수</span><strong>{result.successes}/{GAME_RULES.totalTurns}</strong></div><div><span>최고 협동</span><strong>{result.bestCombo || 0}</strong></div></div>
    <div className={`ranking-save ${rankingStatus}`}><strong>{nickname}</strong><span>{rankingStatus === "saving" ? "랭킹 저장 중…" : rankingStatus === "saved" && myRank ? `전체 ${myRank}위에 올랐어요!` : rankingStatus === "error" ? rankingError : "결과를 정리하고 있어요."}</span></div>
    <div className="result-actions"><button className="primary-button" onClick={onRanking}>전체 랭킹 보기</button><div className="secondary-row"><button className="secondary-button" onClick={onRestart}>다시 당직</button><button className="secondary-button" onClick={onHome}>처음으로</button></div></div>
  </div>;
}

function RankingModal({ entries, status, error, onRefresh, onClose }: { entries: LeaderboardEntry[]; status: RankingStatus; error: string; onRefresh: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="ranking-modal" role="dialog" aria-modal="true" aria-labelledby="ranking-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
    <span className="modal-kicker">해남이 명예의 전당</span><h2 id="ranking-title">전체 당직 랭킹</h2>
    <p className="ranking-intro">기기별 최고 기록 한 개만 반영돼요.</p>
    {status === "loading" ? <div className="ranking-empty">파도 너머 기록을 불러오는 중…</div> : status === "error" && entries.length === 0 ? <div className="ranking-empty error">{error}<button onClick={onRefresh}>다시 불러오기</button></div> : entries.length === 0 ? <div className="ranking-empty">아직 기록이 없어요. 첫 선장이 되어보세요!</div> : <ol className="ranking-list">{entries.map((entry) => <li key={`${entry.rank}-${entry.nickname}`} className={entry.rank <= 3 ? `top-${entry.rank}` : ""}><b>{entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}</b><span><strong>{entry.nickname}</strong><small>{entry.title}</small></span><em>{entry.score.toLocaleString()}점<small>{entry.successes}/10 성공</small></em></li>)}</ol>}
    <button className="primary-button" onClick={onClose}>닫기</button>
  </section></div>;
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
    <span className="modal-kicker">초보 해남이를 위한</span><h2 id="help-title">당직 생존 안내서</h2>
    <ol className="rules-list"><li><b>1</b><span>갑판 사건은 갑판, 기관 사건은 기관, 항해 사건은 항해 수치만 합산해요.</span></li><li><b>2</b><span>매 당직 포인트는 {GAME_RULES.dutyPoints}, 카드는 최대 {GAME_RULES.maxSelected}장까지!</span></li><li><b>3</b><span>{GAME_RULES.totalTurns}번을 버티면 승리, 실패하면 내구도 -{GAME_RULES.failureDamage}예요.</span></li><li><b>4</b><span>관련 직급은 항상 나오지만, 거친 당직에는 요구치를 한 번에 채울 조합이 없을 수도 있어요.</span></li></ol>
    <div className="combo-guide"><strong>협동·지원 보너스</strong><div><span>갑판원 + 1항사</span><b>갑판 +2</b></div><div><span>기관원 + 3기사</span><b>기관 +2</b></div><div><span>3항사 + 2항사</span><b>항해 +2</b></div><div><span>조리장 + 다른 해남이</span><b>대응력 ×1.5</b></div></div>
    <div className="title-guide"><strong>생존 칭호 · 성공 횟수 기준</strong><div><span>멀미하는 실습생</span><b>0~1회</b></div><div><span>구명조끼 꽉 맨 갑판 병아리</span><b>2~3회</b></div><div><span>커피로 버티는 당직 요정</span><b>4~5회</b></div><div><span>파도와 밀당하는 바다 해결사</span><b>6~7회</b></div><div><span>선장님도 찾는 만능 해남이</span><b>8~9회</b></div><div><span>갈매기도 경례하는 전설의 해남이</span><b>10회</b></div><p>각 칭호마다 결과 캐릭터도 달라져요.</p></div>
    <p className="bonus-note">조리장은 다른 카드의 이번 사건 대응력을 1.5배로 올리고, 소수점은 올림해요. 요구치와 딱 맞으면 절약 보너스 +50점!</p><button className="primary-button" onClick={onClose}>알겠어요!</button>
  </section></div>;
}
