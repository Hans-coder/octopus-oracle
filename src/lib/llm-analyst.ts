import type {
  LLMAnalysis,
  Match,
  MatchStats,
  Odds,
  ProbabilityTriple,
} from '@/types';
import { stringToSeed } from './utils';
import { getRedisClient } from './redis';

type Provider = 'disabled' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama';

const localCache = new Map<string, LLMAnalysis>();
const DEFAULT_TTL_SECONDS = 30 * 60;

/** 熔斷器：429 / quota 錯誤後暫停重試，避免洗版 log */
const quotaCircuitBreaker = {
  trippedUntil: 0,
  COOLDOWN_MS: 30 * 60 * 1000, // 30 分鐘
  isTripped(): boolean {
    return Date.now() < this.trippedUntil;
  },
  trip(provider: string) {
    this.trippedUntil = Date.now() + this.COOLDOWN_MS;
    console.warn(
      `[llm] ${provider} quota exceeded – circuit tripped for 30 min. ` +
      'Add billing at https://platform.openai.com/settings/billing',
    );
  },
};

/** Ollama 不可用時的熔斷器 */
const ollamaCircuitBreaker = {
  trippedUntil: 0,
  COOLDOWN_MS: 60 * 1000, // 1 分鐘
  isTripped(): boolean {
    return Date.now() < this.trippedUntil;
  },
  trip() {
    this.trippedUntil = Date.now() + this.COOLDOWN_MS;
    console.warn('[llm] ollama unavailable – disabled for 1 min');
  }
};

function getProvider(): Provider {
  const raw = process.env.LLM_PROVIDER?.toLowerCase() ?? '';
  
  // If ollama tripped, skip it
  if ((raw === 'ollama' || (!raw && process.env.OLLAMA_MODEL)) && ollamaCircuitBreaker.isTripped()) {
    return 'disabled';
  }
  
  // If explicitly set, use that provider
  if (raw === 'openai' && process.env.OPENAI_API_KEY) return 'openai';
  if (raw === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (raw === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini';
  if (raw === 'groq' && process.env.GROQ_API_KEY) return 'groq';
  if (raw === 'ollama') return 'ollama';
  
  // Auto-detect: prioritize local Ollama first, then free providers
  if (!raw) {
    if (process.env.OLLAMA_MODEL) return 'ollama';
    if (process.env.GROQ_API_KEY) return 'groq';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    if (process.env.OPENAI_API_KEY) return 'openai';
  }
  
  return 'disabled';
}

function getCacheTtlSec(): number {
  const n = Number(process.env.LLM_CACHE_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL_SECONDS;
  return Math.max(60, Math.floor(n));
}

function normalize(p: ProbabilityTriple): ProbabilityTriple {
  const sum = p.home + p.draw + p.away || 1;
  return { home: p.home / sum, draw: p.draw / sum, away: p.away / sum };
}

function oddsToImpliedProbs(odds: Odds): ProbabilityTriple {
  const ph = 1 / odds.homeWin;
  const pd = 1 / odds.draw;
  const pa = 1 / odds.awayWin;
  const sum = ph + pd + pa;
  return { home: ph / sum, draw: pd / sum, away: pa / sum };
}

function statsSignature(stats: MatchStats): string {
  return [
    stats.homeForm.recent,
    stats.awayForm.recent,
    stats.homeInjuries.count,
    stats.awayInjuries.count,
    stats.homeInjuries.keyPlayer ?? '-',
    stats.awayInjuries.keyPlayer ?? '-',
    stats.h2h.homeWins,
    stats.h2h.draws,
    stats.h2h.awayWins,
    Math.round(stats.eloDiff),
  ].join('|');
}

function oddsSignature(odds: Odds | undefined): string {
  if (!odds) return 'no-odds';
  const p = oddsToImpliedProbs(odds);
  return [
    odds.updatedAt,
    p.home.toFixed(4),
    p.draw.toFixed(4),
    p.away.toFixed(4),
  ].join('|');
}

function cacheKey(
  match: Match,
  odds: Odds | undefined,
  stats: MatchStats,
  provider: Exclude<Provider, 'disabled'>,
): string {
  const model =
    provider === 'openai'
      ? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
      : provider === 'anthropic'
        ? process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'
        : provider === 'gemini'
          ? process.env.GEMINI_MODEL ?? 'gemini-pro'
          : provider === 'ollama'
            ? process.env.OLLAMA_MODEL ?? 'llama2'
            : process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
  const raw = [
    match.id,
    match.utcDate,
    provider,
    model,
    oddsSignature(odds),
    statsSignature(stats),
  ].join('::');
  return `llm:v4:${stringToSeed(raw)}`;
}

function isFresh(analysis: LLMAnalysis, ttlSec: number): boolean {
  return Date.now() - new Date(analysis.generatedAt).getTime() < ttlSec * 1000;
}

function buildPrompt(match: Match, odds: Odds | undefined, stats: MatchStats): string {
  const lines: string[] = [];
  lines.push('你是足球賽事分析師。只根據提供資料推理，不要引用任何外部或即時新聞。');
  lines.push('');
  lines.push(`比賽: ${match.homeTeam.name}(主) vs ${match.awayTeam.name}(客)`);
  if (match.venue) lines.push(`場地: ${match.venue}`);
  lines.push(`階段: ${match.stage}`);
  lines.push('');
  lines.push(`${match.homeTeam.name} 近況: ${stats.homeForm.recent} (${stats.homeForm.wins}勝${stats.homeForm.draws}和${stats.homeForm.losses}負)`);
  lines.push(`${match.awayTeam.name} 近況: ${stats.awayForm.recent} (${stats.awayForm.wins}勝${stats.awayForm.draws}和${stats.awayForm.losses}負)`);
  lines.push(`傷兵: 主隊 ${stats.homeInjuries.count} 人；客隊 ${stats.awayInjuries.count} 人`);
  lines.push(
    `H2H: ${match.homeTeam.tla} ${stats.h2h.homeWins}-${stats.h2h.draws}-${stats.h2h.awayWins} ${match.awayTeam.tla}`,
  );
  lines.push(`EloDiff(主隊視角): ${stats.eloDiff > 0 ? '+' : ''}${Math.round(stats.eloDiff)}`);
  if (odds) {
    lines.push(
      `1X2 賠率: 主勝 ${odds.homeWin} / 和 ${odds.draw} / 客勝 ${odds.awayWin}`,
    );
  }
  lines.push('');
  lines.push('回傳格式必須是 JSON，且不要任何其他文字：');
  lines.push('{');
  lines.push('  "homeWinProb": 0~1 number,');
  lines.push('  "drawProb": 0~1 number,');
  lines.push('  "awayWinProb": 0~1 number,');
  lines.push('  "keyFactors": ["字串", "字串", "字串", "字串"],');
  lines.push('  "narrative": "50字內，中性、簡潔",');
  lines.push('  "tacticalAnalysis": "50字內的戰術快評，指出這場比賽的戰術勝負手"');
  lines.push('}');
  lines.push('三個機率總和需接近 1。');
  return lines.join('\n');
}

interface LLMRawResponse {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  keyFactors: string[];
  narrative: string;
  tacticalAnalysis?: string;
}

function parseLLMResponse(text: string): LLMRawResponse | null {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as any;
    if (
      typeof obj.homeWinProb !== 'number' ||
      typeof obj.drawProb !== 'number' ||
      typeof obj.awayWinProb !== 'number'
    ) {
      return null;
    }
    return {
      homeWinProb: obj.homeWinProb,
      drawProb: obj.drawProb,
      awayWinProb: obj.awayWinProb,
      keyFactors: obj.keyFactors || [],
      narrative: obj.narrative || '',
      tacticalAnalysis: obj.tacticalAnalysis || obj.tactical_analysis || obj.tactical || obj.analysis,
    } as LLMRawResponse;
  } catch {
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (quotaCircuitBreaker.isTripped()) return null;

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '你是嚴謹的足球資料分析師。你只能使用使用者提供的資料，不得引入外部資訊。輸出必須是 JSON。',
          },
          { role: 'user', content: prompt },
        ],
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 429) {
        quotaCircuitBreaker.trip('openai');
      } else {
        console.error('[llm] openai non-200', res.status, await res.text());
      }
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    // Next.js 靜態生成期間會丟 "Dynamic server usage" 例外，屬預期行為，必須重新丟出以讓 Next.js 處理
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Dynamic server usage')) {
      throw err;
    }
    console.error('[llm] openai exception', err);
    return null;
  }
}

async function callAnthropic(prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (quotaCircuitBreaker.isTripped()) return null;

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.2,
        system:
          '你是嚴謹的足球資料分析師。你只能使用使用者提供的資料，不得引入外部資訊。輸出必須是合法 JSON。',
        messages: [{ role: 'user', content: prompt }],
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 429) {
        quotaCircuitBreaker.trip('anthropic');
      } else {
        console.error('[llm] anthropic non-200', res.status, await res.text());
      }
      return null;
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const textBlock = data.content?.find((b) => b.type === 'text');
    return textBlock?.text ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Dynamic server usage')) {
      throw err;
    }
    console.error('[llm] anthropic exception', err);
    return null;
  }
}

/* ── Google Gemini（免費方案：1,500 次/天）─────────────── */
async function callGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (quotaCircuitBreaker.isTripped()) return null;

  const model = process.env.GEMINI_MODEL ?? 'gemini-pro';
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
        cache: 'no-store',
      },
    );

    if (!res.ok) {
      if (res.status === 429) {
        quotaCircuitBreaker.trip('gemini');
      } else {
        console.error('[llm] gemini non-200', res.status, await res.text());
      }
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Dynamic server usage')) {
      throw err;
    }
    console.error('[llm] gemini exception', err);
    return null;
  }
}

/* ── Groq（免費方案：14,400 次/天，速度極快）────────────── */
async function callGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  if (quotaCircuitBreaker.isTripped()) return null;

  const model = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '你是嚴謹的足球資料分析師。你只能使用使用者提供的資料，不得引入外部資訊。輸出必須是 JSON。',
          },
          { role: 'user', content: prompt },
        ],
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 429) {
        quotaCircuitBreaker.trip('groq');
      } else {
        console.error('[llm] groq non-200', res.status, await res.text());
      }
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Dynamic server usage')) {
      throw err;
    }
    console.error('[llm] groq exception', err);
    return null;
  }
}

/* ── Ollama（本地 LLM：免費，零成本）─────────────────── */
async function callOllama(prompt: string): Promise<string | null> {
  const model = process.env.OLLAMA_MODEL ?? 'llama2';
  const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `你是嚴謹的足球資料分析師。你只能使用使用者提供的資料，不得引入外部資訊。輸出必須是 JSON 格式。\n\n${prompt}`,
        stream: false,
        format: 'json',
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[llm] ollama non-200', res.status, await res.text());
      ollamaCircuitBreaker.trip();
      return null;
    }

    const data = (await res.json()) as { response?: string };
    return data.response?.trim() ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Dynamic server usage')) throw err;
    console.error('[llm] ollama connection failed at', process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434');
    ollamaCircuitBreaker.trip();
    return null;
  }
}

async function getFromCaches(key: string, ttlSec: number): Promise<LLMAnalysis | null> {
  const local = localCache.get(key);
  if (local && isFresh(local, ttlSec)) return local;

  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const remote = await redis.get<LLMAnalysis>(key);
    if (remote && isFresh(remote, ttlSec)) {
      localCache.set(key, remote);
      return remote;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Dynamic server usage')) throw err;
    console.warn('[llm] redis read failed', err);
  }

  return null;
}

async function setCaches(key: string, value: LLMAnalysis, ttlSec: number): Promise<void> {
  localCache.set(key, value);

  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSec });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Dynamic server usage')) throw err;
    console.warn('[llm] redis write failed', err);
  }
}

export async function getLLMAnalysis(
  match: Match,
  odds: Odds | undefined,
  stats: MatchStats,
): Promise<LLMAnalysis | null> {
  const provider = getProvider();
  if (provider === 'disabled') return null;

  const ttlSec = getCacheTtlSec();
  const key = cacheKey(match, odds, stats, provider);

  const cached = await getFromCaches(key, ttlSec);
  if (cached) return cached;

  const prompt = buildPrompt(match, odds, stats);
  const raw =
    provider === 'openai'
      ? await callOpenAI(prompt)
      : provider === 'anthropic'
        ? await callAnthropic(prompt)
        : provider === 'gemini'
          ? await callGemini(prompt)
          : provider === 'groq'
            ? await callGroq(prompt)
            : await callOllama(prompt);
  if (!raw) return null;

  const parsed = parseLLMResponse(raw);
  if (!parsed) {
    console.warn('[llm] parse failed', match.id);
    return null;
  }

  const result: LLMAnalysis = {
    matchId: match.id,
    probs: normalize({
      home: parsed.homeWinProb,
      draw: parsed.drawProb,
      away: parsed.awayWinProb,
    }),
    keyFactors: Array.isArray(parsed.keyFactors)
      ? parsed.keyFactors.filter(Boolean).slice(0, 4)
      : [],
    narrative: (parsed.narrative ?? '').slice(0, 120),
    tacticalAnalysis: parsed.tacticalAnalysis ? parsed.tacticalAnalysis.slice(0, 150) : undefined,
    provider,
    generatedAt: new Date().toISOString(),
  };

  await setCaches(key, result, ttlSec);
  return result;
}

export async function getLLMAnalysisMap(
  matches: Match[],
  oddsMap: Map<string, Odds>,
  statsMap: Map<string, MatchStats>,
): Promise<Map<string, LLMAnalysis>> {
  const map = new Map<string, LLMAnalysis>();
  const provider = getProvider();
  if (provider === 'disabled') return map;

  const concurrency = 3;
  for (let i = 0; i < matches.length; i += concurrency) {
    const chunk = matches.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (m) => {
        const stats = statsMap.get(m.id);
        if (!stats) return null;
        const analysis = await getLLMAnalysis(m, oddsMap.get(m.id), stats);
        return analysis ? ([m.id, analysis] as const) : null;
      }),
    );

    for (const r of results) {
      if (!r) continue;
      map.set(r[0], r[1]);
    }
  }

  return map;
}

export function invalidateLLMCache() {
  localCache.clear();
}

export function debugCurrentProvider(): Provider {
  return getProvider();
}
