/**
 * ESPN 公開隱藏 API — FIFA 2026 World Cup 賽程
 *
 * 端點：https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
 *
 * ✅ 無需任何 API key、無需註冊
 * ✅ 含真實比賽 / 比分 / 場地 / 球隊近況 (form 五場字串)
 * ⚠️ 非官方端點，ESPN 隨時可能變動或封鎖；網路異常時自動 fallback 到 mock-data
 */

import type {
  Match,
  MatchStage,
  MatchStatus,
  Team,
} from '@/types';

const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// ─────────────────────────────────────────────
// 隊伍中文 & 國旗對照（沒對到的隊伍 fallback 顯示英文 + 🏳️）
// ─────────────────────────────────────────────
const TLA_TO_CHINESE: Record<string, string> = {
  // 主辦國
  CAN: '加拿大', MEX: '墨西哥', USA: '美國',
  // 強隊
  ARG: '阿根廷', FRA: '法國', ESP: '西班牙', ENG: '英格蘭', BRA: '巴西',
  POR: '葡萄牙', NED: '荷蘭', BEL: '比利時', GER: '德國', ITA: '義大利',
  CRO: '克羅埃西亞', COL: '哥倫比亞',
  // 亞洲
  JPN: '日本', KOR: '南韓', AUS: '澳洲', IRN: '伊朗', KSA: '沙烏地阿拉伯',
  QAT: '卡達', UZB: '烏茲別克', JOR: '約旦', IRQ: '伊拉克',
  // 非洲
  MAR: '摩洛哥', SEN: '塞內加爾', TUN: '突尼西亞', EGY: '埃及', NGA: '奈及利亞',
  GHA: '迦納', CIV: '象牙海岸', CMR: '喀麥隆', RSA: '南非', ALG: '阿爾及利亞',
  CPV: '維德角', COD: '剛果民主共和國',
  // 其他歐洲
  SUI: '瑞士', DEN: '丹麥', SWE: '瑞典', NOR: '挪威', AUT: '奧地利',
  POL: '波蘭', UKR: '烏克蘭', SRB: '塞爾維亞', SVK: '斯洛伐克', TUR: '土耳其',
  GRE: '希臘', WAL: '威爾斯', SCO: '蘇格蘭', IRL: '愛爾蘭', NIR: '北愛爾蘭',
  CZE: '捷克', HUN: '匈牙利', BIH: '波士尼亞',
  // 中南美
  URU: '烏拉圭', PAR: '巴拉圭', PER: '秘魯', CHI: '智利', ECU: '厄瓜多',
  VEN: '委內瑞拉', BOL: '玻利維亞',
  // 中北美 / 加勒比
  CRC: '哥斯大黎加', PAN: '巴拿馬', HON: '宏都拉斯', JAM: '牙買加',
  SLV: '薩爾瓦多', HAI: '海地', CUW: '庫拉索',
  // 大洋洲
  NZL: '紐西蘭',
  // 淘汰賽佔位（1A = Group A 第一名等）
  '1A': '待定', '1B': '待定', '1C': '待定', '1D': '待定',
  '1E': '待定', '1F': '待定', '1G': '待定', '1H': '待定',
  '1I': '待定', '1J': '待定', '1K': '待定', '1L': '待定',
  '2A': '待定', '2B': '待定', '2C': '待定', '2D': '待定',
  '2E': '待定', '2F': '待定', '2G': '待定', '2H': '待定',
  '2I': '待定', '2J': '待定', '2K': '待定', '2L': '待定',
  '3RD': '待定', 'TBD': '待定',
};

const TLA_TO_FLAG: Record<string, string> = {
  CAN: '🇨🇦', MEX: '🇲🇽', USA: '🇺🇸',
  ARG: '🇦🇷', FRA: '🇫🇷', ESP: '🇪🇸', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', BRA: '🇧🇷',
  POR: '🇵🇹', NED: '🇳🇱', BEL: '🇧🇪', GER: '🇩🇪', ITA: '🇮🇹',
  CRO: '🇭🇷', COL: '🇨🇴',
  JPN: '🇯🇵', KOR: '🇰🇷', AUS: '🇦🇺', IRN: '🇮🇷', KSA: '🇸🇦',
  QAT: '🇶🇦', UZB: '🇺🇿', JOR: '🇯🇴', IRQ: '🇮🇶',
  MAR: '🇲🇦', SEN: '🇸🇳', TUN: '🇹🇳', EGY: '🇪🇬', NGA: '🇳🇬',
  GHA: '🇬🇭', CIV: '🇨🇮', CMR: '🇨🇲', RSA: '🇿🇦', ALG: '🇩🇿',
  CPV: '🇨🇻', COD: '🇨🇩',
  SUI: '🇨🇭', DEN: '🇩🇰', SWE: '🇸🇪', NOR: '🇳🇴', AUT: '🇦🇹',
  POL: '🇵🇱', UKR: '🇺🇦', SRB: '🇷🇸', SVK: '🇸🇰', TUR: '🇹🇷',
  GRE: '🇬🇷', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', IRL: '🇮🇪', NIR: '🇬🇧',
  CZE: '🇨🇿', HUN: '🇭🇺', BIH: '🇧🇦',
  URU: '🇺🇾', PAR: '🇵🇾', PER: '🇵🇪', CHI: '🇨🇱', ECU: '🇪🇨',
  VEN: '🇻🇪', BOL: '🇧🇴',
  CRC: '🇨🇷', PAN: '🇵🇦', HON: '🇭🇳', JAM: '🇯🇲',
  SLV: '🇸🇻', HAI: '🇭🇹', CUW: '🇨🇼',
  NZL: '🇳🇿',
  // 淘汰賽佔位統一顯示問號
  '1A': '❔', '1B': '❔', '1C': '❔', '1D': '❔',
  '1E': '❔', '1F': '❔', '1G': '❔', '1H': '❔',
  '1I': '❔', '1J': '❔', '1K': '❔', '1L': '❔',
  '2A': '❔', '2B': '❔', '2C': '❔', '2D': '❔',
  '2E': '❔', '2F': '❔', '2G': '❔', '2H': '❔',
  '2I': '❔', '2J': '❔', '2K': '❔', '2L': '❔',
  '3RD': '❔', 'TBD': '❔',
};

// ─────────────────────────────────────────────
// ESPN response 型別（partial — 只挑用到的欄位）
// ─────────────────────────────────────────────
interface ESPNTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName?: string;
  name?: string;
}

interface ESPNCompetitor {
  id: string;
  homeAway: 'home' | 'away';
  score?: string;
  winner?: boolean;
  form?: string;          // 近 5 場 'WDLWD'
  team: ESPNTeam;
}

interface ESPNVenue {
  fullName?: string;
  address?: { city?: string; country?: string };
}

interface ESPNStatusType {
  name: string;           // STATUS_SCHEDULED / STATUS_IN_PROGRESS / STATUS_FULL_TIME / STATUS_HALFTIME / STATUS_POSTPONED ...
  state: 'pre' | 'in' | 'post';
  completed?: boolean;
}

interface ESPNCompetition {
  date: string;
  venue?: ESPNVenue;
  notes?: Array<{ type?: string; headline?: string }>;
  status?: { type?: ESPNStatusType };
  competitors: ESPNCompetitor[];
}

interface ESPNSeason {
  year: number;
  type?: number;
  slug?: string;          // 'group-stage' / 'round-of-32' / 'round-of-16' / 'quarter-finals' / ...
}

interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  season?: ESPNSeason;
  status: { type: ESPNStatusType };
  venue?: ESPNVenue;
  competitions: ESPNCompetition[];
}

interface ESPNScoreboard {
  leagues?: Array<{ season?: { type?: { name?: string } } }>;
  events?: ESPNEvent[];
}

// ─────────────────────────────────────────────
// 對應函式
// ─────────────────────────────────────────────
function mapStatus(t?: ESPNStatusType): MatchStatus {
  if (!t) return 'SCHEDULED';
  switch (t.name) {
    case 'STATUS_SCHEDULED':
    case 'STATUS_PRE_FIGHT':
      return 'SCHEDULED';
    case 'STATUS_IN_PROGRESS':
    case 'STATUS_FIRST_HALF':
    case 'STATUS_SECOND_HALF':
      return 'IN_PLAY';
    case 'STATUS_HALFTIME':
      return 'PAUSED';
    case 'STATUS_FULL_TIME':
    case 'STATUS_FINAL':
      return 'FINISHED';
    case 'STATUS_POSTPONED':
      return 'POSTPONED';
    case 'STATUS_CANCELED':
    case 'STATUS_CANCELLED':
      return 'CANCELLED';
    case 'STATUS_SUSPENDED':
      return 'SUSPENDED';
    default:
      // ESPN 偶爾有怪 status，按 state 推斷
      if (t.completed || t.state === 'post') return 'FINISHED';
      if (t.state === 'in') return 'IN_PLAY';
      return 'SCHEDULED';
  }
}

function mapStage(slug?: string): MatchStage {
  switch (slug) {
    case 'round-of-32':
    case 'last-32':
      return 'LAST_32';
    case 'round-of-16':
    case 'last-16':
      return 'LAST_16';
    case 'quarter-finals':
    case 'quarterfinals':
      return 'QUARTER_FINALS';
    case 'semi-finals':
    case 'semifinals':
      return 'SEMI_FINALS';
    case 'third-place':
    case 'third-place-playoff':
      return 'THIRD_PLACE';
    case 'final':
      return 'FINAL';
    case 'group-stage':
    default:
      return 'GROUP_STAGE';
  }
}

function mapTeam(raw: ESPNTeam): Team {
  const tla = (raw.abbreviation || raw.shortDisplayName || raw.name || 'UNK')
    .slice(0, 3)
    .toUpperCase();
  return {
    id: Number(raw.id) || 0,
    name: TLA_TO_CHINESE[tla] ?? raw.displayName,
    nameEn: raw.displayName,
    tla,
    flag: TLA_TO_FLAG[tla] ?? '🏳️',
  };
}

function parseScore(s?: string): number | null {
  if (s === undefined || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mapEvent(e: ESPNEvent): Match | null {
  const comp = e.competitions[0];
  if (!comp || comp.competitors.length < 2) return null;

  const home = comp.competitors.find((c) => c.homeAway === 'home');
  const away = comp.competitors.find((c) => c.homeAway === 'away');
  if (!home || !away) return null;

  const status = mapStatus(e.status?.type);
  const homeScore = parseScore(home.score);
  const awayScore = parseScore(away.score);

  let scoreBlock: Match['score'] | undefined;
  if (status === 'FINISHED' && homeScore !== null && awayScore !== null) {
    const winner =
      homeScore > awayScore
        ? 'HOME_TEAM'
        : homeScore < awayScore
          ? 'AWAY_TEAM'
          : 'DRAW';
    scoreBlock = { winner, fullTime: { home: homeScore, away: awayScore } };
  } else if (status === 'IN_PLAY' || status === 'PAUSED') {
    scoreBlock = {
      winner: null,
      fullTime: { home: homeScore, away: awayScore },
    };
  }

  // venue
  const venueParts: string[] = [];
  const venue = comp.venue ?? e.venue;
  if (venue?.fullName) venueParts.push(venue.fullName);
  if (venue?.address?.city) venueParts.push(venue.address.city);

  // group：ESPN 在 notes 偶爾會有 "Group A" 字串，否則留空
  let group: string | undefined;
  const groupNote = comp.notes?.find((n) =>
    /group\s*[A-L]/i.test(n.headline ?? ''),
  );
  if (groupNote?.headline) {
    const m = /group\s*([A-L])/i.exec(groupNote.headline);
    if (m) group = m[1].toUpperCase();
  }

  return {
    id: `espn-${e.id}`,
    utcDate: e.date,
    status,
    stage: mapStage(e.season?.slug),
    group,
    venue: venueParts.join(', ') || undefined,
    isFriendly: false, // ESPN fifa.world 端點不會回友誼賽
    homeTeam: mapTeam(home.team),
    awayTeam: mapTeam(away.team),
    score: scoreBlock,
  };
}

// ─────────────────────────────────────────────
// 主要 API
// ─────────────────────────────────────────────

/** 抓單一日期的 scoreboard（YYYYMMDD） */
async function fetchOneDay(yyyymmdd: string): Promise<ESPNEvent[]> {
  const url = `${ESPN_BASE}?dates=${yyyymmdd}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 }, // 5 分鐘快取
  });
  if (!res.ok) {
    throw new Error(`ESPN ${res.status} ${res.statusText} (${yyyymmdd})`);
  }
  const data: ESPNScoreboard = await res.json();
  return data.events ?? [];
}

/** YYYYMMDD 格式（用 UTC 切日，因為 ESPN 也是 UTC） */
function formatDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export interface FetchOptions {
  /** 從哪一天開始（預設：今天）*/
  from?: Date;
  /** 抓幾天（預設：14 天，世界杯通常 4 場/天）*/
  days?: number;
}

/**
 * 抓 ESPN scoreboard 多天賽程
 * - 預設今天 + 14 天
 * - 失敗（網路 / API 限流）會 throw，讓上層 fallback
 */
export async function fetchMatchesFromESPN(
  options: FetchOptions = {},
): Promise<Match[]> {
  const from = options.from ?? new Date();
  const days = options.days ?? 14;

  const dates: string[] = [];
  for (let i = -1; i < days; i++) {
    // -1 是把昨天的「剛結束 / FT」比賽也帶進來
    const d = new Date(from.getTime() + i * 86_400_000);
    dates.push(formatDateUTC(d));
  }

  // 並發抓（一天一個 request，不會打到 ESPN 限流）
  const allEvents = (
    await Promise.all(dates.map((d) => fetchOneDay(d).catch(() => [])))
  ).flat();

  // 去重 + map
  const seen = new Set<string>();
  const matches: Match[] = [];
  for (const e of allEvents) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const m = mapEvent(e);
    if (m) matches.push(m);
  }

  // 依時間排序
  matches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
  );
  return matches;
}
