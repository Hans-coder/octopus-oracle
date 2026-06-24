'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type {
  Match,
  MultiMarketPicks,
  Prediction,
  PredictionPick,
} from '@/types';
import { cn } from '@/lib/utils';
import { seededRandom, stringToSeed } from '@/lib/utils';

interface OctopusPredictorProps {
  prediction: Prediction;
  /** 需要 match 資訊才能渲染三個選項盒；缺少時點召喚會直接揭曉 */
  match?: Match;
  /** 來自父層（受持久化驅動）：是否已揭曉 */
  revealed: boolean;
  /** SSR / Hydration 期間設 false，避免狀態閃爍 */
  hydrated?: boolean;
  /** 動畫完成時呼叫，告知父層持久化揭曉狀態 */
  onRevealComplete: () => void;
  compact?: boolean;
  /** 比賽實際結果；有值代表比賽已結束，能標記章魚哥對錯 */
  actual?: PredictionPick | null;
}

const REVEAL_DURATION_MS = 3800;

type InternalPhase = 'auto' | 'forced-idle' | 'revealing';

export default function OctopusPredictor({
  prediction,
  match,
  revealed,
  hydrated = true,
  onRevealComplete,
  compact = false,
  actual = null,
}: OctopusPredictorProps) {
  const [internalPhase, setInternalPhase] = useState<InternalPhase>('auto');

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
            prediction={prediction}
            match={match}
          />
        )}
        {displayPhase === 'revealed' && (
          <RevealedState
            key="revealed"
            prediction={prediction}
            actual={actual}
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
/*  Revealing — 動畫序列                              */
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
  const pickedIdx = options.findIndex((o) => o.key === prediction.pick);

  return (
    <motion.div
      className="relative flex flex-col items-center gap-4 py-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="text-5xl"
        initial={{ y: -10, scale: 0.8 }}
        animate={{
          y: [-10, 0, -3, 0, -5, 0],
          rotate: [-15, 5, -10, 8, -3, 0],
          scale: [0.8, 1, 1.05, 1, 1.08, 1],
        }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
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
          ✨ 章魚哥神諭即將降臨…
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────── */
/*  Revealed — 揭曉狀態                               */
/* ────────────────────────────────────────────────── */
function RevealedState({
  prediction,
  actual,
  allowReplay,
  onResummon,
  compact,
}: {
  prediction: Prediction;
  actual: PredictionPick | null;
  allowReplay: boolean;
  onResummon: () => void;
  compact: boolean;
}) {
  const confidencePct = Math.round(prediction.confidence * 100);
  const hasResult = actual !== null;
  const isCorrect = hasResult ? prediction.pick === actual : null;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 頂列：標題 + 對錯標籤 + 重看按鈕 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan-300/80">
          <Sparkles className="h-3 w-3" />
          <span>章魚哥神諭</span>
        </div>
        {isCorrect === true && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
            <CheckCircle2 className="h-2.5 w-2.5" />
            命中
          </span>
        )}
        {isCorrect === false && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-200">
            <XCircle className="h-2.5 w-2.5" />
            未中
          </span>
        )}
        {allowReplay && (
          <button
            type="button"
            onClick={onResummon}
            className="ml-auto rounded-full p-1 text-slate-400 transition hover:bg-white/5 hover:text-cyan-200"
            title="重看一次召喚動畫"
            aria-label="重看一次召喚動畫"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* 主玩法 — 章魚哥 + 隊伍 + 信心 */}
      <div className="mt-2 flex items-center gap-3">
        <motion.div
          className={cn(
            'text-4xl',
            isCorrect === false && 'opacity-60 grayscale',
          )}
          animate={{ rotate: [0, -8, 8, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          🐙
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <motion.span
              className="text-2xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.05 }}
            >
              {prediction.pickedTeamFlag}
            </motion.span>
            <motion.span
              className={cn(
                'truncate text-lg font-bold',
                isCorrect === false
                  ? 'text-slate-400 line-through decoration-rose-400/60'
                  : 'text-white',
              )}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 }}
              title={prediction.pickedTeamName}
            >
              {prediction.pickedTeamName}
            </motion.span>
            <motion.span
              className="ml-auto rounded-full bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-medium text-cyan-200"
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
          className={cn(
            'relative mt-3 break-words text-xs italic leading-relaxed',
            isCorrect === false ? 'text-slate-500' : 'text-slate-300',
          )}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          &ldquo;{prediction.reasoning}&rdquo;
        </motion.p>
      )}

      {/* 多玩法神諭 */}
      {prediction.extras && (
        <ExtrasStrip 
          extras={prediction.extras} 
          matchId={prediction.matchId}
          dimmed={isCorrect === false} 
        />
      )}

      {prediction.source && (
        <p className="mt-2 text-[10px] text-slate-500">
          🤖 由 {prediction.source} 即時生成
        </p>
      )}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────── */
/*  多玩法神諭                                        */
/* ────────────────────────────────────────────────── */
function ExtrasStrip({
  extras,
  matchId,
  dimmed,
}: {
  extras: MultiMarketPicks;
  matchId: string;
  dimmed?: boolean;
}) {
  const pills: Array<{
    key: string;
    icon: string;
    label: string;
    value: string;
    title: string;
    confidence: number;
  }> = [];

  if (extras.correctScore) {
    const cs = extras.correctScore;
    pills.push({
      key: 'cs',
      icon: '🎯',
      label: '正確比數',
      value: `${cs.home}-${cs.away}`,
      title: cs.reasoning ?? `正確比數 ${cs.home}-${cs.away}`,
      confidence: cs.confidence,
    });
  }
  if (extras.overUnder) {
    const ou = extras.overUnder;
    pills.push({
      key: 'ou',
      icon: ou.pick === 'OVER' ? '⬆️' : '⬇️',
      label: `大小分 ${ou.line}`,
      value: ou.pick === 'OVER' ? '大' : '小',
      title: ou.reasoning ?? `${ou.pick === 'OVER' ? '大' : '小'}盤`,
      confidence: ou.confidence,
    });
  }
  if (extras.btts) {
    pills.push({
      key: 'btts',
      icon: extras.btts.pick === 'YES' ? '⚽' : '🛡️',
      label: '雙方均得分',
      value: extras.btts.pick === 'YES' ? '是' : '否',
      title: extras.btts.reasoning ?? `雙方均得分：${extras.btts.pick === 'YES' ? '是' : '否'}`,
      confidence: extras.btts.confidence,
    });
  }
  if (extras.halfTime) {
    const htLabel =
      extras.halfTime.pick === 'HOME'
        ? '主'
        : extras.halfTime.pick === 'AWAY'
          ? '客'
          : '和';
    pills.push({
      key: 'ht',
      icon: '🥚',
      label: '上半場不讓分',
      value: htLabel,
      title: extras.halfTime.reasoning ?? `上半場不讓分：${htLabel}`,
      confidence: extras.halfTime.confidence,
    });
  }
  if (extras.totalGoals) {
    pills.push({
      key: 'tg',
      icon: '🔢',
      label: '總進球數',
      value: extras.totalGoals.label,
      title: extras.totalGoals.reasoning ?? `總進球落點：${extras.totalGoals.label}`,
      confidence: extras.totalGoals.confidence,
    });
  }
  if (extras.handicap) {
    const sign = extras.handicap.line > 0 ? '+' : '';
    pills.push({
      key: 'ah',
      icon: '⚖️',
      label: `讓分盤 ${sign}${extras.handicap.line}`,
      value: extras.handicap.pick === 'HOME' ? '主' : '客',
      title: extras.handicap.reasoning ?? `讓分盤 ${sign}${extras.handicap.line}：${extras.handicap.pick === 'HOME' ? '主' : '客'}`,
      confidence: extras.handicap.confidence,
    });
  }

  if (pills.length === 0) return null;

  // 用 matchId 作為種子，打亂 pills 順序（同場比賽每次都一樣）
  const seed = stringToSeed(`extras-order-${matchId}`);
  const rng = seededRandom(seed);
  pills.sort(() => rng() - 0.5);

  return (
    <motion.div
      className={cn('mt-3', dimmed && 'opacity-60')}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: dimmed ? 0.6 : 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-slate-500">
        <span>📊</span>
        <span>章魚哥多玩法神諭</span>
        <span className="h-px flex-1 bg-white/5" />
      </div>
      <div className="flex flex-wrap gap-1">
        {pills.map((p) => (
          <span
            key={p.key}
            className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-slate-900/60 px-2 py-0.5 text-[10px]"
            title={`${p.title}（信心 ${Math.round(p.confidence * 100)}%）`}
          >
            <span>{p.icon}</span>
            <span className="text-slate-400">{p.label}</span>
            <span className="font-bold text-white">{p.value}</span>
            <span className="text-[9px] text-slate-500">
              {Math.round(p.confidence * 100)}%
            </span>
          </span>
        ))}
      </div>
    </motion.div>
  );
}
