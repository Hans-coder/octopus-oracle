'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, RotateCcw, Sparkle } from 'lucide-react';
import type {
  EngineId,
  Match,
  Prediction,
  PredictionBundle,
} from '@/types';
import { cn } from '@/lib/utils';
import { ENGINES, ENGINE_META } from '@/lib/octopus';

interface OctopusPredictorProps {
  bundle: PredictionBundle;
  /** 需要 match 資訊才能渲染三個選項盒；缺少時點召喚會直接揭曉 */
  match?: Match;
  /** 來自父層（受持久化驅動）：是否已揭曉 */
  revealed: boolean;
  /** SSR / Hydration 期間設 false，避免狀態閃爍 */
  hydrated?: boolean;
  /** 動畫完成時呼叫，告知父層持久化揭曉狀態 */
  onRevealComplete: () => void;
  compact?: boolean;
}

const REVEAL_DURATION_MS = 3800;
const HERO_ENGINE: EngineId = 'paul';

type InternalPhase = 'auto' | 'forced-idle' | 'revealing';

const ACCENT_TAB_ACTIVE: Record<'cyan' | 'emerald' | 'violet', string> = {
  cyan: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/40',
  emerald: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/40',
  violet: 'bg-violet-400/15 text-violet-200 border-violet-400/40',
};

const ACCENT_TEXT: Record<'cyan' | 'emerald' | 'violet', string> = {
  cyan: 'text-cyan-300/80',
  emerald: 'text-emerald-300/80',
  violet: 'text-violet-300/80',
};

const ACCENT_BADGE: Record<'cyan' | 'emerald' | 'violet', string> = {
  cyan: 'bg-cyan-500/20 text-cyan-200',
  emerald: 'bg-emerald-500/20 text-emerald-200',
  violet: 'bg-violet-500/20 text-violet-200',
};

export default function OctopusPredictor({
  bundle,
  match,
  revealed,
  hydrated = true,
  onRevealComplete,
  compact = false,
}: OctopusPredictorProps) {
  const [internalPhase, setInternalPhase] = useState<InternalPhase>('auto');
  const [activeEngine, setActiveEngine] = useState<EngineId>(HERO_ENGINE);

  const heroPrediction = bundle[HERO_ENGINE];

  // 計算最終顯示的 phase
  // SSR / hydration 前固定顯示 'idle' 避免閃爍
  const displayPhase: 'idle' | 'revealing' | 'revealed' = (() => {
    if (!hydrated) return 'idle';
    if (internalPhase === 'revealing') return 'revealing';
    if (internalPhase === 'forced-idle') return 'idle';
    return revealed ? 'revealed' : 'idle';
  })();

  const handleReveal = () => {
    if (!match) {
      setInternalPhase('auto');
      onRevealComplete();
      return;
    }
    setInternalPhase('revealing');
    window.setTimeout(() => {
      setInternalPhase('auto');
      onRevealComplete();
    }, REVEAL_DURATION_MS);
  };

  const handleResummon = () => {
    setInternalPhase('forced-idle');
    setActiveEngine(HERO_ENGINE);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-blue-950/60 to-cyan-950/60 p-4',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
        displayPhase === 'idle' ? 'min-h-[120px]' : 'min-h-[170px]',
      )}
    >
      <BubbleBackground />

      <AnimatePresence mode="wait">
        {displayPhase === 'idle' && (
          <IdleState key="idle" onReveal={handleReveal} hasMatch={!!match} />
        )}
        {displayPhase === 'revealing' && match && (
          <RevealingState
            key="revealing"
            prediction={heroPrediction}
            match={match}
          />
        )}
        {displayPhase === 'revealed' && (
          <RevealedTabbed
            key="revealed"
            bundle={bundle}
            activeEngine={activeEngine}
            onChange={setActiveEngine}
            allowReplay={!!match}
            onResummon={handleResummon}
            compact={compact}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────── */
/*  背景氣泡                                          */
/* ────────────────────────────────────────────────── */
function BubbleBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-cyan-400/20"
          style={{
            width: `${6 + i * 2}px`,
            height: `${6 + i * 2}px`,
            left: `${10 + i * 18}%`,
            bottom: '-10px',
          }}
          animate={{ y: [0, -120 - i * 20], opacity: [0, 0.6, 0] }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.8,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────── */
/*  Idle — 召喚按鈕                                   */
/* ────────────────────────────────────────────────── */
function IdleState({
  onReveal,
  hasMatch,
}: {
  onReveal: () => void;
  hasMatch: boolean;
}) {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center gap-3 py-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="text-3xl opacity-50"
        animate={{
          y: [0, -4, 0],
          rotate: [0, -3, 3, 0],
          filter: ['blur(2px)', 'blur(1px)', 'blur(2px)'],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        🐙
      </motion.div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-300/80">
          <Sparkles className="h-3 w-3" />
          章魚哥神諭
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {hasMatch ? '尚未揭曉，輕觸召喚' : '預測中…'}
        </div>
      </div>

      <motion.button
        type="button"
        onClick={onReveal}
        className="group relative inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/20 hover:text-white hover:shadow-[0_0_25px_-2px_rgba(34,211,238,0.7)]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
      >
        <Eye className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
        召喚章魚哥
      </motion.button>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────── */
/*  Revealing — 動畫序列（永遠用 hero/Paul）          */
/* ────────────────────────────────────────────────── */
function RevealingState({
  prediction,
  match,
}: {
  prediction: Prediction;
  match: Match;
}) {
  const options = [
    {
      key: 'HOME' as const,
      flag: match.homeTeam.flag,
      label: match.homeTeam.tla,
    },
    { key: 'DRAW' as const, flag: '🤝', label: '和局' },
    {
      key: 'AWAY' as const,
      flag: match.awayTeam.flag,
      label: match.awayTeam.tla,
    },
  ];
  const pickedIdx = Math.max(
    0,
    options.findIndex((o) => o.key === prediction.pick),
  );
  const pickedX = `${(pickedIdx - 1) * 110}%`;

  return (
    <motion.div
      className="relative flex flex-col items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative text-5xl drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]"
        initial={{ y: 60, opacity: 0, scale: 0.3 }}
        animate={{
          y: [60, 0, 0, 0, 0, -4],
          opacity: [0, 1, 1, 1, 1, 1],
          scale: [0.3, 1, 1, 1, 1.15, 1.15],
          x: ['0%', '0%', '-110%', '110%', pickedX, pickedX],
          rotate: [0, 0, -15, 15, 0, 0],
        }}
        transition={{
          duration: 3.5,
          times: [0, 0.18, 0.4, 0.6, 0.82, 1],
          ease: 'easeInOut',
        }}
      >
        🐙
      </motion.div>

      <div className="grid w-full grid-cols-3 gap-2">
        {options.map((opt, idx) => {
          const isPicked = idx === pickedIdx;
          return (
            <motion.div
              key={opt.key}
              className="flex flex-col items-center rounded-lg border bg-slate-900/60 px-2 py-2"
              initial={{
                opacity: 0,
                y: 15,
                borderColor: 'rgba(255,255,255,0.15)',
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isPicked
                  ? [1, 1, 1, 1, 1.15, 1.15]
                  : [1, 1, 1, 1, 0.9, 0.9],
                borderColor: isPicked
                  ? [
                      'rgba(255,255,255,0.15)',
                      'rgba(255,255,255,0.15)',
                      'rgba(255,255,255,0.15)',
                      'rgba(255,255,255,0.15)',
                      'rgba(34,211,238,0.9)',
                      'rgba(34,211,238,0.9)',
                    ]
                  : 'rgba(255,255,255,0.08)',
                boxShadow: isPicked
                  ? [
                      '0 0 0 rgba(34,211,238,0)',
                      '0 0 0 rgba(34,211,238,0)',
                      '0 0 0 rgba(34,211,238,0)',
                      '0 0 0 rgba(34,211,238,0)',
                      '0 0 30px -5px rgba(34,211,238,0.7)',
                      '0 0 30px -5px rgba(34,211,238,0.7)',
                    ]
                  : '0 0 0 rgba(34,211,238,0)',
              }}
              transition={{
                delay: 0.3 + idx * 0.12,
                duration: 3.2,
                times: [0, 0.08, 0.3, 0.5, 0.85, 1],
              }}
            >
              <span className="text-2xl">{opt.flag}</span>
              <span className="text-[10px] font-medium text-slate-300">
                {opt.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="relative h-4 w-full">
        <motion.span
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] italic text-cyan-300/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.6, times: [0, 0.2, 0.7, 1] }}
        >
          🌊 正在感應深海能量…
        </motion.span>
        <motion.span
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] italic text-cyan-300/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{
            duration: 2.2,
            delay: 1.5,
            times: [0, 0.1, 0.3, 0.7, 1],
          }}
        >
          ✨ 三隻章魚哥神諭即將降臨…
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────── */
/*  Revealed — 三隻章魚哥分頁                         */
/* ────────────────────────────────────────────────── */
function RevealedTabbed({
  bundle,
  activeEngine,
  onChange,
  allowReplay,
  onResummon,
  compact,
}: {
  bundle: PredictionBundle;
  activeEngine: EngineId;
  onChange: (id: EngineId) => void;
  allowReplay: boolean;
  onResummon: () => void;
  compact: boolean;
}) {
  const prediction = bundle[activeEngine];
  const meta = ENGINE_META[activeEngine];
  const confidencePct = Math.round(prediction.confidence * 100);
  const isConsensus = !!bundle.consensus;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 上方 Tab bar */}
      <div className="flex items-center gap-1">
        {ENGINES.map((e) => {
          const isActive = e.id === activeEngine;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onChange(e.id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition',
                isActive
                  ? ACCENT_TAB_ACTIVE[e.accent]
                  : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-200',
              )}
              title={`${e.name}・${e.title}`}
              aria-pressed={isActive}
            >
              <span>{e.emoji}</span>
              <span className="hidden sm:inline">{e.shortName}</span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1">
          {isConsensus && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-300"
              title="三隻章魚哥意見一致"
            >
              <Sparkle className="h-2.5 w-2.5" />
              三隻一致
            </span>
          )}
          {allowReplay && (
            <button
              type="button"
              onClick={onResummon}
              className="rounded-full p-1 text-slate-400 transition hover:bg-white/5 hover:text-cyan-200"
              title="重看一次召喚動畫"
              aria-label="重看一次召喚動畫"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 切換動畫 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeEngine}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className="mt-3"
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="text-4xl"
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {meta.emoji}
            </motion.div>

            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'flex items-center gap-1.5 text-[10px] uppercase tracking-widest',
                  ACCENT_TEXT[meta.accent],
                )}
              >
                <Sparkles className="h-3 w-3" />
                <span>{meta.name}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{meta.title}</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <motion.span
                  className="text-2xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.05 }}
                >
                  {prediction.pickedTeamFlag}
                </motion.span>
                <motion.span
                  className="text-lg font-bold text-white"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 }}
                >
                  {prediction.pickedTeamName}
                </motion.span>
                <motion.span
                  className={cn(
                    'ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] font-medium',
                    ACCENT_BADGE[meta.accent],
                  )}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  {confidencePct}%
                </motion.span>
              </div>
            </div>
          </div>

          {!compact && (
            <motion.p
              className="relative mt-3 text-xs italic leading-relaxed text-slate-300"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              “{prediction.reasoning}”
            </motion.p>
          )}

          {activeEngine === 'oracle' && prediction.source && (
            <p className="mt-2 text-[10px] text-slate-500">
              {prediction.source === 'mock'
                ? '⚙️ 章魚神諭官目前以本地分析運作（未設定 LLM API key）'
                : `🤖 由 ${prediction.source} 即時生成`}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
