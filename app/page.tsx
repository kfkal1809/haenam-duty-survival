"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  CREW_CARDS,
  calculateResponse,
  createInitialHand,
  drawNextEvent,
  fillHand,
  getTitle,
  scoreResolution,
  type CrewCard,
  type GameEvent,
} from "../lib/game";

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
  terminal: boolean;
};
type Result = {
  won: boolean;
  score: number;
  hull: number;
  successes: number;
  bestCombo: number;
  title: string;
};

const STORAGE = {
  highScore: "haenam-duty-high-score",
  highTitle: "haenam-duty-high-title",
  sound: "haenam-duty-sound",
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedScore = Number(localStorage.getItem(STORAGE.highScore) ?? 0);
      setHighScore(Number.isFinite(savedScore) ? savedScore : 0);
      setHighTitle(localStorage.getItem(STORAGE.highTitle) || "첫 당직 대기 중");
      setSoundOn(localStorage.getItem(STORAGE.sound) !== "off");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedCards = useMemo(
    () => game ? game.selected.map((id) => CREW_CARDS.find((card) => card.id === id)).filter((card): card is CrewCard => Boolean(card)) : [],
    [game],
  );
  const response = useMemo(
    () => game ? calculateResponse(game.selected, game.event.skill) : { total: 0, comboBonus: 0, activeCombos: [] },
    [game],
  );
  const spent = selectedCards.reduce((sum, card) => sum + card.cost, 0);

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

  function startGame() {
    playTone("click");
    setGame({ turn: 1, hull: 10, score: 0, hand: createInitialHand(), selected: [], event: drawNextEvent(), successes: 0, bestCombo: 0 });
    setOutcome(null);
    setResult(null);
    setNotice("");
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
    if (game.selected.length >= 3) return setNotice("한 번에 최대 3명까지 배치할 수 있어요!");
    if (spent + card.cost > 5) return setNotice("당직 포인트가 부족해요!");
    setGame({ ...game, selected: [...game.selected, card.id] });
    setNotice("");
  }

  function resolveTurn() {
    if (!game || outcome) return;
    if (game.selected.length === 0) return setNotice("대응할 해남이를 먼저 선택해 주세요!");
    const current = calculateResponse(game.selected, game.event.skill);
    const success = current.total >= game.event.required;
    const points = scoreResolution({ success, total: current.total, required: game.event.required, comboCount: current.activeCombos.length });
    const hull = success ? game.hull : Math.max(0, game.hull - 2);
    const terminal = hull === 0 || game.turn === 10;
    setGame({
      ...game,
      hull,
      score: game.score + points,
      successes: game.successes + (success ? 1 : 0),
      bestCombo: Math.max(game.bestCombo, current.activeCombos.length),
    });
    setOutcome({ success, points, total: current.total, combos: current.activeCombos.map((combo) => combo.name), terminal });
    setNotice("");
    playTone(success ? (terminal && hull > 0 ? "win" : "success") : "fail");
  }

  function continueGame() {
    if (!game || !outcome) return;
    if (outcome.terminal) {
      const won = game.hull > 0 && game.turn === 10;
      const finalScore = game.score + (won ? game.hull * 50 : 0);
      const title = getTitle(finalScore, !won);
      setResult({ won, score: finalScore, hull: game.hull, successes: game.successes, bestCombo: game.bestCombo, title });
      setScreen("result");
      setOutcome(null);
      if (finalScore > highScore) {
        setHighScore(finalScore);
        setHighTitle(title);
        localStorage.setItem(STORAGE.highScore, String(finalScore));
        localStorage.setItem(STORAGE.highTitle, title);
      }
      return;
    }
    setGame({ ...game, turn: game.turn + 1, hand: fillHand(game.hand, game.selected), selected: [], event: drawNextEvent(game.event.id) });
    setOutcome(null);
  }

  return (
    <main className="site-shell">
      <div className="ocean-decor ocean-decor-one" aria-hidden="true" />
      <div className="ocean-decor ocean-decor-two" aria-hidden="true" />
      <section className="phone-frame" aria-live="polite">
        {screen === "start" && <StartScreen highScore={highScore} highTitle={highTitle} soundOn={soundOn} onSound={toggleSound} onStart={startGame} onHelp={() => setShowHelp(true)} />}
        {screen === "game" && game && <GameScreen game={game} spent={spent} selectedCards={selectedCards} total={response.total} comboNames={response.activeCombos.map((combo) => combo.name)} notice={notice} soundOn={soundOn} outcome={outcome} onSound={toggleSound} onToggleCard={toggleCard} onResolve={resolveTurn} onContinue={continueGame} />}
        {screen === "result" && result && <ResultScreen result={result} highScore={highScore} onRestart={startGame} onHome={() => setScreen("start")} />}
      </section>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </main>
  );
}

function StartScreen({ highScore, highTitle, soundOn, onSound, onStart, onHelp }: { highScore: number; highTitle: string; soundOn: boolean; onSound: () => void; onStart: () => void; onHelp: () => void }) {
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
      <div className="best-card"><span>나의 최고 기록</span><strong>{highScore.toLocaleString()}점</strong><em>{highTitle}</em></div>
      <div className="start-actions">
        <button className="primary-button" onClick={onStart}><span>⚓</span> 당직 시작</button>
        <button className="secondary-button" onClick={onHelp}>게임 방법</button>
      </div>
    </div>
  );
}

function GameScreen({ game, spent, selectedCards, total, comboNames, notice, soundOn, outcome, onSound, onToggleCard, onResolve, onContinue }: { game: GameState; spent: number; selectedCards: CrewCard[]; total: number; comboNames: string[]; notice: string; soundOn: boolean; outcome: Outcome | null; onSound: () => void; onToggleCard: (card: CrewCard) => void; onResolve: () => void; onContinue: () => void }) {
  const meta = EVENT_META[game.event.skill];
  return (
    <div className="game-screen screen-panel">
      <header className="game-header">
        <div className="turn-badge"><span>당직</span><strong>{game.turn}/10</strong></div>
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
        <div className="zone-title"><span>선택한 해남이</span><span className={total >= game.event.required ? "ready" : ""}>대응력 {total}/{game.event.required}</span></div>
        <div className="selected-row">
          {selectedCards.length === 0 ? <p>아래 카드에서 1~3명을 선택하세요</p> : selectedCards.map((card) => <button key={card.id} onClick={() => onToggleCard(card)}><img src={card.image} alt="" /><span>{card.name}</span></button>)}
        </div>
        {comboNames.length > 0 && <div className="combo-ribbon">✦ {comboNames.join(" · ")} 발동!</div>}
      </section>
      <section className="hand-section">
        <div className="hand-heading"><strong>손패</strong><span>당직 포인트 <b>{5 - spent}</b>/5</span></div>
        <div className="hand-grid">
          {game.hand.map((id) => {
            const card = CREW_CARDS.find((item) => item.id === id)!;
            const selected = game.selected.includes(card.id);
            return <CrewCardButton key={card.id} card={card} selected={selected} disabled={Boolean(outcome) || (!selected && spent + card.cost > 5)} onClick={() => onToggleCard(card)} />;
          })}
        </div>
      </section>
      <div className="action-area">
        <p className="notice">{notice || "카드를 누르면 배치·취소할 수 있어요"}</p>
        <button className="primary-button respond-button" onClick={onResolve} disabled={Boolean(outcome)}>대응하기 <span>›</span></button>
      </div>
      {outcome && <div className={`outcome-layer ${outcome.success ? "success" : "failure"}`}><div className="outcome-card">
        <div className="outcome-face">{outcome.success ? "(•ᴗ•)و" : "(×﹏×)"}</div>
        <span>{outcome.success ? "대응 성공!" : "우당탕! 대응 실패"}</span>
        <h2>{outcome.success ? `+${outcome.points}점 획득` : game.event.failure}</h2>
        <p>대응력 {outcome.total} · 요구치 {game.event.required}</p>
        {outcome.combos.length > 0 && <em>협동 보너스: {outcome.combos.join(", ")}</em>}
        <button className="primary-button" onClick={onContinue}>{outcome.terminal ? "결과 확인" : "다음 당직"}</button>
      </div></div>}
    </div>
  );
}

function CrewCardButton({ card, selected, disabled, onClick }: { card: CrewCard; selected: boolean; disabled: boolean; onClick: () => void }) {
  const stats = [card.stats.deck ? `갑 ${card.stats.deck}` : "", card.stats.engine ? `기 ${card.stats.engine}` : "", card.stats.navigation ? `항 ${card.stats.navigation}` : ""].filter(Boolean);
  return <button className={`crew-card ${selected ? "selected" : ""}`} disabled={disabled} onClick={onClick} aria-pressed={selected}>
    <span className="cost-badge">{card.cost}</span>{selected && <span className="check-badge">✓</span>}
    <div className="crew-image-wrap"><img src={card.image} alt={`${card.name} 캐릭터`} /></div>
    <strong>{card.name}</strong><small>{stats.join(" · ")}</small>
  </button>;
}

function ResultScreen({ result, highScore, onRestart, onHome }: { result: Result; highScore: number; onRestart: () => void; onHome: () => void }) {
  return <div className={`result-screen screen-panel ${result.won ? "won" : "lost"}`}>
    <div className="result-confetti" aria-hidden="true">✦　⚓　✦</div>
    <span className="result-kicker">{result.won ? "목적지 도착!" : "선박 내구도 0"}</span>
    <h1>{result.won ? "당직 생존 성공" : "오늘은 여기까지!"}</h1>
    <p>{result.won ? "열 번의 당직을 무사히 버텨냈어요." : "해남이들이 배를 수리하러 총출동했어요."}</p>
    <div className="result-character"><img src={result.won ? "/images/crew/master-chief.png" : "/images/crew/engine-rating.png"} alt="결과 해남이 캐릭터" /><span>{result.won ? "최고의 당직이었어!" : "다음엔 꼭 해내자!"}</span></div>
    <div className="title-medal"><span>획득 칭호</span><strong>{result.title}</strong></div>
    <div className="result-score"><span>최종 점수</span><strong>{result.score.toLocaleString()}</strong>{result.score === highScore && result.score > 0 && <em>BEST!</em>}</div>
    <div className="result-stats"><div><span>남은 내구도</span><strong>{result.hull}</strong></div><div><span>성공 횟수</span><strong>{result.successes}/10</strong></div><div><span>최고 협동</span><strong>{result.bestCombo || 0}</strong></div></div>
    <div className="result-actions"><button className="primary-button" onClick={onRestart}>다시 당직 서기</button><button className="secondary-button" onClick={onHome}>처음으로</button></div>
  </div>;
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
    <span className="modal-kicker">초보 해남이를 위한</span><h2 id="help-title">당직 생존 안내서</h2>
    <ol className="rules-list"><li><b>1</b><span>사건의 요구치만큼 해당 능력치를 모아주세요.</span></li><li><b>2</b><span>매 당직 포인트는 5, 카드는 최대 3장까지!</span></li><li><b>3</b><span>10번을 버티면 승리, 실패하면 내구도 -2예요.</span></li></ol>
    <div className="combo-guide"><strong>협동 보너스 조합</strong><div><span>갑판원 + 갑판장</span><b>갑판 +2</b></div><div><span>기관원 + 기관장</span><b>기관 +2</b></div><div><span>3항기사 + 2항기사</span><b>항해 +2</b></div><div><span>갑판장 + 1항기사</span><b>갑판 +2</b></div></div>
    <p className="bonus-note">요구치와 딱 맞으면 절약 보너스 +50점!</p><button className="primary-button" onClick={onClose}>알겠어요!</button>
  </section></div>;
}
