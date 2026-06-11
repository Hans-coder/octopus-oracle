import type { Match, MatchStage, MatchStatus, Team } from '@/types';
import { mockMatches } from './mock-data';

const API_BASE = 'https://api.football-data.org/v4';

interface RawTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

interface RawMatch {
  id: number;
  utcDate: string;
  status: MatchStatus;
  stage: MatchStage | string;
  group?: string;
  matchday?: number;
  venue?: string;
  homeTeam: RawTeam;
  awayTeam: RawTeam;
  score?: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    fullTime?: { home: number | null; away: number | null };
  };
}

const TLA_TO_CHINESE: Record<string, string> = {
  CAN: '加拿大', MEX: '墨西哥', USA: '美國', JPN: '日本', KOR: '南韓',
  BRA: '巴西', ARG: '阿根廷', FRA: '法國', ENG: '英格蘭', ESP: '西班牙',
  GER: '德國', POR: '葡萄牙', NED: '荷蘭', BEL: '比利時', ITA: '義大利',
  CRO: '克羅埃西亞', URU: '烏拉圭', MAR: '摩洛哥', SEN: '塞內加爾',
  AUS: '澳洲', SUI: '瑞士', COL: '哥倫比亞', DEN: '丹麥', ECU: '厄瓜多',
};

const TLA_TO_FLAG: Record<string, string> = {
  CAN: '🇨🇦', MEX: '🇲🇽', USA: '🇺🇸', JPN: '🇯🇵', KOR: '🇰🇷',
  BRA: '🇧🇷', ARG: '🇦🇷', FRA: '🇫🇷', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸',
  GER: '🇩🇪', POR: '🇵🇹', NED: '🇳🇱', BEL: '🇧🇪', ITA: '🇮🇹',
  CRO: '🇭🇷', URU: '🇺🇾', MAR: '🇲🇦', SEN: '🇸🇳',
  AUS: '🇦🇺', SUI: '🇨🇭', COL: '🇨🇴', DEN: '🇩🇰', ECU: '🇪🇨',
};

function mapTeam(raw: RawTeam): Team {
  const tla = raw.tla ?? raw.shortName?.slice(0, 3).toUpperCase() ?? 'UNK';
  return {
    id: raw.id,
    name: TLA_TO_CHINESE[tla] ?? raw.name,
    nameEn: raw.name,
    tla,
    flag: TLA_TO_FLAG[tla] ?? '🏳️',
  };
}

function mapMatch(raw: RawMatch): Match {
  return {
    id: String(raw.id),
    utcDate: raw.utcDate,
    status: raw.status,
    stage: (raw.stage as MatchStage) ?? 'GROUP_STAGE',
    group: raw.group,
    matchday: raw.matchday,
    venue: raw.venue,
    homeTeam: mapTeam(raw.homeTeam),
    awayTeam: mapTeam(raw.awayTeam),
    score: raw.score
      ? {
          winner: raw.score.winner,
          fullTime: raw.score.fullTime ?? { home: null, away: null },
        }
      : undefined,
  };
}

export interface FetchOptions {
  /** ISO date 例如 2026-06-11，僅取當日 */
  dateFrom?: string;
  dateTo?: string;
}

/**
 * 從 football-data.org 拉取賽程。若無 token / 失敗，回退到 mock 資料。
 */
export async function getMatches(options: FetchOptions = {}): Promise<Match[]> {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  const competition = process.env.FOOTBALL_COMPETITION_ID ?? 'WC';
  const useMock = process.env.USE_MOCK_DATA === 'true' || !token;

  if (useMock) {
    return filterMatches(mockMatches, options);
  }

  try {
    const params = new URLSearchParams();
    if (options.dateFrom) params.set('dateFrom', options.dateFrom);
    if (options.dateTo) params.set('dateTo', options.dateTo);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/competitions/${competition}/matches${qs}`, {
      headers: { 'X-Auth-Token': token },
      next: { revalidate: 300 }, // 5 分鐘快取
    });

    if (!res.ok) {
      throw new Error(`football-data.org ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as { matches: RawMatch[] };
    return data.matches.map(mapMatch);
  } catch (err) {
    console.error('[football-api] 拉取失敗，回退到 mock：', err);
    return filterMatches(mockMatches, options);
  }
}

function filterMatches(matches: Match[], { dateFrom, dateTo }: FetchOptions): Match[] {
  if (!dateFrom && !dateTo) return matches;
  return matches.filter((m) => {
    const t = new Date(m.utcDate).getTime();
    if (dateFrom && t < new Date(dateFrom).getTime()) return false;
    if (dateTo && t > new Date(dateTo).getTime() + 86400000) return false;
    return true;
  });
}

/** 抓單一場次 */
export async function getMatchById(id: string): Promise<Match | undefined> {
  const all = await getMatches();
  return all.find((m) => m.id === id);
}
