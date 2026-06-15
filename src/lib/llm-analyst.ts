import type {
  LLMAnalysis,
  Match,
  MatchStats,
  Odds,
  ProbabilityTriple,
} from '@/types';
import { seededRandom, stringToSeed } from './utils';

/**
 * 章魚神諭官 — LLM 結構化分析器
 *
 * 三種模式：
 * - `LLM_PROVIDER=mock`（預設）：用程式產生擬真分析，零成本
 * - `LLM_PROVIDER=openai`：呼叫 OpenAI chat completion（需 OPENAI_API_KEY）
 * - `LLM_PROVIDER=anthropic`：呼叫 Anthropic messages API（需 ANTHROPIC_API_KEY）
 *
 * 重點：永遠輸出結構化結果 {probs, keyFactors, narrative}
 * 用 in-memory cache 避免重複呼叫，cron 預先暖機。
 */

type Provider = 'mock' | 'openai' | 'anthropic';

function getProvider(): Provider {
  const raw = process.env.LLM_PROVIDER?.toLowerCase() ?? 'mock';
  if (raw === 'openai' && process.env.OPENAI_API_KEY) return 'openai';
  if (raw === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'mock';
}

// ─────────────────────────────────────────────
// In-memory cache (per-process)
// ─────────────────────────────────────────────
const cache = new Map<string, LLMAnalysis>();
const TTL_MS = 6 * 60 * 60 * 1000; // 6 小時

function cacheKey(matchId: string) {
  return `llm:${matchId}`;
}

function isFresh(analysis: LLMAnalysis): boolean {
  return Date.now() - new Date(analysis.generatedAt).getTime() < TTL_MS;
}

// ─────────────────────────────────────────────
// Mock provider — 用 stats 推算「LLM 風格」結果
// ─────────────────────────────────────────────
const NARRATIVE_TEMPLATES_HOME = [
  '{home} 近期狀態回穩，搭配主場聲援，章魚神諭官嗅到一絲冠軍氣息。',
  '{home} 中前場火力全開，加上 {away} 的關鍵後衛缺陣，這場勢必傾斜。',
  '從 H2H 紀錄看，{home} 對上 {away} 心理優勢明顯，神諭官壓寶 {home}。',
  '{away} 客場+傷兵雙重壓力，{home} 只要穩守反擊就有機會帶走 3 分。',
];

const NARRATIVE_TEMPLATES_AWAY = [
  '{away} 雖在客場，但近期勢頭壓過 {home}，章魚神諭官選擇相信數字。',
  '{home} 主力中場缺陣，{away} 的中場控制力本就略勝一籌，預判翻盤。',
  '近 5 戰 {away} 全數獲勝，這支即將起飛的隊伍不容小覷。',
  '{home} 防線多處輪空，{away} 鋒線正逢狀態巔峰，1 分必須擠出來。',
];

const NARRATIVE_TEMPLATES_DRAW = [
  '兩隊狀態接近、Elo 拉鋸，章魚神諭官難得宣告「90 分鐘內無人勝出」。',
  '{home} vs {away} 五次交手三和，傳統不容易拉開差距，看好平局。',
  '雙方都有傷兵、雙方都怕輸，這場比賽會比預期還悶。',
];

function pickNarrative(
  template: string[],
  rng: () => number,
  home: string,
  away: string,
): string {
  const t = template[Math.floor(rng() * template.length)];
  return t.replace(/\{home\}/g, home).replace(/\{away\}/g, away);
}

function buildKeyFactors(
  match: Match,
  stats: MatchStats,
  rng: () => number,
): string[] {
  const f: string[] = [];

  // form
  const hf = stats.homeForm;
  const af = stats.awayForm;
  f.push(
    `${match.homeTeam.name} 近 5 戰 ${hf.wins}勝${hf.draws}和${hf.losses}負（${hf.recent}）`,
  );
  f.push(
    `${match.awayTeam.name} 近 5 戰 ${af.wins}勝${af.draws}和${af.losses}負（${af.recent}）`,
  );

  // Elo
  if (Math.abs(stats.eloDiff) > 50) {
    const stronger =
      stats.eloDiff > 0 ? match.homeTeam.name : match.awayTeam.name;
    f.push(
      `Elo 評分 ${stronger} 領先 ${Math.abs(Math.round(stats.eloDiff))} 分`,
    );
  } else {
    f.push('Elo 評分兩隊勢均力敵');
  }

  // 傷兵
  if (stats.homeInjuries.keyPlayer) {
    f.push(`${match.homeTeam.name} 關鍵球員 ${stats.homeInjuries.keyPlayer} 缺陣`);
  } else if (stats.homeInjuries.count > 0) {
    f.push(`${match.homeTeam.name} 有 ${stats.homeInjuries.count} 名球員傷停`);
  }
  if (stats.awayInjuries.keyPlayer) {
    f.push(`${match.awayTeam.name} 關鍵球員 ${stats.awayInjuries.keyPlayer} 缺陣`);
  } else if (stats.awayInjuries.count > 0) {
    f.push(`${match.awayTeam.name} 有 ${stats.awayInjuries.count} 名球員傷停`);
  }

  // H2H
  const { homeWins, draws, awayWins, played } = stats.h2h;
  if (played > 0) {
    f.push(
      `近 ${played} 次交手：${match.homeTeam.tla} ${homeWins}-${draws}-${awayWins} ${match.awayTeam.tla}`,
    );
  }

  // 隨機保留 4 條
  for (let i = f.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [f[i], f[j]] = [f[j], f[i]];
  }
  return f.slice(0, 4);
}

function mockAnalyze(
  match: Match,
  odds: Odds | undefined,
  stats: MatchStats,
): LLMAnalysis {
  const rng = seededRandom(stringToSeed(`llm-mock-${match.id}`));

  // 用 elo + form + 賠率合成 LLM 預期機率（讓 LLM「看起來最聰明」）
  const elo = stats.eloProbs;
  const homeFormBoost = (stats.homeForm.formIndex - 0.5) * 0.15;
  const awayFormBoost = (stats.awayForm.formIndex - 0.5) * 0.15;

  // 傷兵懲罰
  const homeInjuryPenalty = stats.homeInjuries.severity * 0.08;
  const awayInjuryPenalty = stats.awayInjuries.severity * 0.08;

  let pHome = elo.home + homeFormBoost - homeInjuryPenalty + awayInjuryPenalty * 0.5;
  let pAway = elo.away + awayFormBoost - awayInjuryPenalty + homeInjuryPenalty * 0.5;
  let pDraw = elo.draw;

  // 賠率加成（若有）
  if (odds) {
    const oddsProbs = oddsToImpliedProbs(odds);
    pHome = pHome * 0.6 + oddsProbs.home * 0.4;
    pDraw = pDraw * 0.6 + oddsProbs.draw * 0.4;
    pAway = pAway * 0.6 + oddsProbs.away * 0.4;
  }

  // 正規化 + 加小幅雜訊
  const probs = normalize({
    home: Math.max(0.03, pHome) * (0.95 + rng() * 0.1),
    draw: Math.max(0.03, pDraw) * (0.95 + rng() * 0.1),
    away: Math.max(0.03, pAway) * (0.95 + rng() * 0.1),
  });

  const top = topPick(probs);
  const narrativeRng = seededRandom(stringToSeed(`llm-narr-${match.id}`));
  let narrative: string;
  if (top === 'HOME') {
    narrative = pickNarrative(
      NARRATIVE_TEMPLATES_HOME,
      narrativeRng,
      match.homeTeam.name,
      match.awayTeam.name,
    );
  } else if (top === 'AWAY') {
    narrative = pickNarrative(
      NARRATIVE_TEMPLATES_AWAY,
      narrativeRng,
      match.homeTeam.name,
      match.awayTeam.name,
    );
  } else {
    narrative = pickNarrative(
      NARRATIVE_TEMPLATES_DRAW,
      narrativeRng,
      match.homeTeam.name,
      match.awayTeam.name,
    );
  }

  return {
    matchId: match.id,
    probs,
    keyFactors: buildKeyFactors(match, stats, rng),
    narrative,
    provider: 'mock',
    generatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
// 工具函式
// ─────────────────────────────────────────────
function oddsToImpliedProbs(odds: Odds): ProbabilityTriple {
  const ph = 1 / odds.homeWin;
  const pd = 1 / odds.draw;
  const pa = 1 / odds.awayWin;
  const sum = ph + pd + pa;
  return { home: ph / sum, draw: pd / sum, away: pa / sum };
}

function normalize(p: ProbabilityTriple): ProbabilityTriple {
  const sum = p.home + p.draw + p.away || 1;
  return { home: p.home / sum, draw: p.draw / sum, away: p.away / sum };
}

function topPick(p: ProbabilityTriple): 'HOME' | 'DRAW' | 'AWAY' {
  if (p.home >= p.draw && p.home >= p.away) return 'HOME';
  if (p.away >= p.draw) return 'AWAY';
  return 'DRAW';
}

// ─────────────────────────────────────────────
// 真實 OpenAI / Anthropic provider
// ─────────────────────────────────────────────

function buildPrompt(
  match: Match,
  odds: Odds | undefined,
  stats: MatchStats,
): string {
  const lines: string[] = [];
  lines.push(`你是足球賽事分析師，請冷靜分析以下世界杯比賽：`);
  lines.push('');
  lines.push(`【比賽】${match.homeTeam.name}（主）vs ${match.awayTeam.name}（客）`);
  if (match.venue) lines.push(`【場地】${match.venue}`);
  if (match.stage) lines.push(`【階段】${match.stage}`);
  lines.push('');
  lines.push(`【${match.homeTeam.name} 狀態】`);
  lines.push(
    `  近 5 戰：${stats.homeForm.wins}勝${stats.homeForm.draws}和${stats.homeForm.losses}負（${stats.homeForm.recent}）`,
  );
  lines.push(
    `  進失球：${stats.homeForm.goalsFor}:${stats.homeForm.goalsAgainst}`,
  );
  lines.push(
    `  傷兵：${stats.homeInjuries.count} 人${
      stats.homeInjuries.keyPlayer ? `（含 ${stats.homeInjuries.keyPlayer}）` : ''
    }`,
  );
  lines.push('');
  lines.push(`【${match.awayTeam.name} 狀態】`);
  lines.push(
    `  近 5 戰：${stats.awayForm.wins}勝${stats.awayForm.draws}和${stats.awayForm.losses}負（${stats.awayForm.recent}）`,
  );
  lines.push(
    `  進失球：${stats.awayForm.goalsFor}:${stats.awayForm.goalsAgainst}`,
  );
  lines.push(
    `  傷兵：${stats.awayInjuries.count} 人${
      stats.awayInjuries.keyPlayer ? `（含 ${stats.awayInjuries.keyPlayer}）` : ''
    }`,
  );
  lines.push('');
  lines.push(
    `【近 ${stats.h2h.played} 次交手】${match.homeTeam.tla} ${stats.h2h.homeWins}-${stats.h2h.draws}-${stats.h2h.awayWins} ${match.awayTeam.tla}`,
  );
  lines.push(`【Elo 差距】${stats.eloDiff > 0 ? '+' : ''}${stats.eloDiff}（主隊視角）`);
  if (odds) {
    lines.push(`【章魚推算盤】不讓分主勝 ${odds.homeWin} / 和局 ${odds.draw} / 不讓分客勝 ${odds.awayWin}`);
  }
  lines.push('');
  lines.push(
    `請只根據以上資料分析（不要引用即時新聞），輸出 JSON 物件，**不要任何前綴後綴**：`,
  );
  lines.push(`{`);
  lines.push(`  "homeWinProb": 0-1 浮點數,`);
  lines.push(`  "drawProb": 0-1 浮點數,`);
  lines.push(`  "awayWinProb": 0-1 浮點數,`);
  lines.push(`  "keyFactors": ["關鍵因素 1", "關鍵因素 2", "關鍵因素 3", "關鍵因素 4"],`);
  lines.push(`  "narrative": "用『章魚神諭官』戲劇化的口吻給出 1-2 句中文預告"`);
  lines.push(`}`);
  lines.push('');
  lines.push(`三個機率必須加總 ≈ 1。`);

  return lines.join('\n');
}

interface LLMRawResponse {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  keyFactors: string[];
  narrative: string;
}

function parseLLMResponse(text: string): LLMRawResponse | null {
  // 移除 ```json … ``` 包裹
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  // 找第一個 { … } 整段
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as LLMRawResponse;
    if (
      typeof obj.homeWinProb !== 'number' ||
      typeof obj.drawProb !== 'number' ||
      typeof obj.awayWinProb !== 'number'
    ) {
      return null;
    }
    return obj;
  } catch {
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
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
        messages: [
          {
            role: 'system',
            content:
              '你是嚴謹的足球資料分析師，永遠只用使用者提供的資料推理，不能引用外部即時資訊。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
      // 不快取，由我們自己的 cache 處理
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[llm] openai non-200', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('[llm] openai exception', err);
    return null;
  }
}

async function callAnthropic(prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
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
        max_tokens: 800,
        temperature: 0.4,
        system:
          '你是嚴謹的足球資料分析師，永遠只用使用者提供的資料推理，不能引用外部即時資訊。輸出必須是合法 JSON 物件，不要 markdown code fence。',
        messages: [{ role: 'user', content: prompt }],
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[llm] anthropic non-200', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const textBlock = data.content?.find((b) => b.type === 'text');
    return textBlock?.text ?? null;
  } catch (err) {
    console.error('[llm] anthropic exception', err);
    return null;
  }
}

/**
 * 取得一場比賽的 LLM 分析結果
 *
 * 流程：
 * 1. in-memory cache 有 & 沒過期 → 直接回
 * 2. provider=mock → mockAnalyze
 * 3. provider=openai/anthropic → 呼叫 API、解析、失敗則 fallback mock
 */
export async function getLLMAnalysis(
  match: Match,
  odds: Odds | undefined,
  stats: MatchStats,
): Promise<LLMAnalysis> {
  const key = cacheKey(match.id);
  const cached = cache.get(key);
  if (cached && isFresh(cached)) return cached;

  const provider = getProvider();

  if (provider === 'mock') {
    const result = mockAnalyze(match, odds, stats);
    cache.set(key, result);
    return result;
  }

  const prompt = buildPrompt(match, odds, stats);
  const raw =
    provider === 'openai' ? await callOpenAI(prompt) : await callAnthropic(prompt);

  if (!raw) {
    const fallback = mockAnalyze(match, odds, stats);
    cache.set(key, fallback);
    return fallback;
  }

  const parsed = parseLLMResponse(raw);
  if (!parsed) {
    console.warn('[llm] 解析失敗，回退 mock', match.id);
    const fallback = mockAnalyze(match, odds, stats);
    cache.set(key, fallback);
    return fallback;
  }

  const probs = normalize({
    home: parsed.homeWinProb,
    draw: parsed.drawProb,
    away: parsed.awayWinProb,
  });
  const result: LLMAnalysis = {
    matchId: match.id,
    probs,
    keyFactors: parsed.keyFactors?.slice(0, 4) ?? [],
    narrative: parsed.narrative ?? '',
    provider,
    generatedAt: new Date().toISOString(),
  };
  cache.set(key, result);
  return result;
}

/**
 * 批次取得 LLM 分析（用 Promise.all，但限制並發避免 rate limit）
 */
export async function getLLMAnalysisMap(
  matches: Match[],
  oddsMap: Map<string, Odds>,
  statsMap: Map<string, import('@/types').MatchStats>,
): Promise<Map<string, LLMAnalysis>> {
  const map = new Map<string, LLMAnalysis>();
  const provider = getProvider();
  // mock 一次跑沒差；真的呼叫 API 要限制並發
  const concurrency = provider === 'mock' ? matches.length : 4;

  for (let i = 0; i < matches.length; i += concurrency) {
    const chunk = matches.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (m) => {
        const a = await getLLMAnalysis(m, oddsMap.get(m.id), statsMap.get(m.id)!);
        return [m.id, a] as const;
      }),
    );
    for (const [id, a] of results) map.set(id, a);
  }
  return map;
}

/** 給 cron route 用：強制刷新所有快取（清掉再讓下一次 SSR 重生） */
export function invalidateLLMCache() {
  cache.clear();
}

/** 給除錯用 */
export function debugCurrentProvider(): Provider {
  return getProvider();
}
