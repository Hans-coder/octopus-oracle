// 共用型別定義

export interface Team {
  id: number;
  name: string;       // 中文隊名
  nameEn: string;     // 英文隊名
  tla: string;        // 三字母縮寫 e.g. BRA / JPN
  flag: string;       // emoji 國旗
  group?: string;     // 分組 A-L
}

export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'LIVE'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'POSTPONED'
  | 'SUSPENDED'
  | 'CANCELLED';

export type MatchWinner = 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW';

export type MatchStage =
  | 'GROUP_STAGE'
  | 'LAST_32'
  | 'LAST_16'
  | 'QUARTER_FINALS'
  | 'SEMI_FINALS'
  | 'THIRD_PLACE'
  | 'FINAL';

export interface Match {
  id: string;                // 統一字串 ID
  utcDate: string;           // ISO timestamp
  status: MatchStatus;
  stage: MatchStage;
  group?: string;
  matchday?: number;
  venue?: string;
  /** 是否為熱身賽 / 友誼賽（不列入正賽神準率） */
  isFriendly?: boolean;
  homeTeam: Team;
  awayTeam: Team;
  score?: {
    winner: MatchWinner | null;
    fullTime: { home: number | null; away: number | null };
  };
}

export interface Odds {
  matchId: string;
  homeWin: number;   // 主勝賠率
  draw: number;      // 和局賠率
  awayWin: number;   // 客勝賠率
  trend?: OddsTrend;
  /** 衡生玩法（大小分 / 雙方均得分 / 上半場 / 總進球數 / 波膽 / 讓分盤） */
  markets?: ExtraMarkets;
  source: string;    // 資料來源（例「章魚推算盤」）
  updatedAt: string; // ISO timestamp
}

export interface OddsTrend {
  favoredSide: PredictionPick | 'EVEN';
  movement: number;
  summary: string;
  previousUpdatedAt?: string;
  currentUpdatedAt?: string;
}

/** 大小（總進球 over/under line） */
export interface OverUnderMarket {
  line: number;       // 通常 2.5
  overOdds: number;
  underOdds: number;
}

/** 讓分盤（讓主隊 line，正值代表主隊讓分） */
export interface HandicapMarket {
  line: number;       // e.g. -0.5 表示主隊讓 0.5；+0.5 表示主隊被讓 0.5
  homeOdds: number;
  awayOdds: number;
}

/** 客進（雙方都進球） */
export interface BTTSMarket {
  yesOdds: number;
  noOdds: number;
}

/** 上半場 1X2 */
export interface HalfTimeMarket {
  homeWin: number;
  draw: number;
  awayWin: number;
}

/** 正確比分（top N） */
export interface CorrectScoreMarket {
  scores: Array<{ home: number; away: number; odds: number }>;
}

/** 總進球（進球數區間） */
export interface TotalGoalsMarket {
  brackets: Array<{ label: string; min: number; max: number | null; odds: number }>;
}

export interface ExtraMarkets {
  overUnder?: OverUnderMarket;
  handicap?: HandicapMarket;
  btts?: BTTSMarket;
  halfTime?: HalfTimeMarket;
  correctScore?: CorrectScoreMarket;
  totalGoals?: TotalGoalsMarket;
}

export type PredictionPick = 'HOME' | 'DRAW' | 'AWAY';

/** 三選一機率分布（home + draw + away ≈ 1） */
export interface ProbabilityTriple {
  home: number;
  draw: number;
  away: number;
}

/** 球隊近期狀態 */
export interface TeamForm {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  /** 0-1 「狀態指數」(W=3, D=1, L=0) / (played*3) */
  formIndex: number;
  /** 文字摘要 'WWLDW' */
  recent: string;
}

/** 兩隊歷史交手 */
export interface HeadToHead {
  played: number;
  homeWins: number;
  draws: number;
  awayWins: number;
}

/** 傷兵狀況 */
export interface InjuryReport {
  count: number;        // 受傷球員數
  keyPlayer?: string;   // 最關鍵的缺陣球員名（mock 用）
  /** 0-1，越高代表越嚴重 */
  severity: number;
}

/** 整場比賽的統計特徵（給章魚哥分析用） */
export interface MatchStats {
  matchId: string;
  homeForm: TeamForm;
  awayForm: TeamForm;
  homeInjuries: InjuryReport;
  awayInjuries: InjuryReport;
  h2h: HeadToHead;
  /** Elo 評分差（home - away） */
  eloDiff: number;
  /** Elo 推算的機率 */
  eloProbs: ProbabilityTriple;
}

/** LLM 結構化分析輸出 */
export interface LLMAnalysis {
  matchId: string;
  probs: ProbabilityTriple;
  /** 3-5 個關鍵因素，每個一行短句 */
  keyFactors: string[];
  /** 章魚神諭官的詩意預告，1-2 句 */
  narrative: string;
  /** AI 的戰術快評 */
  tacticalAnalysis?: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama';
  generatedAt: string;
}

/** 章魚哥的識別 — 只剩一隻致敬版 Paul，保留 type 給未來擴充 */
export type EngineId = 'paul';

export const ENGINE_IDS: readonly EngineId[] = ['paul'] as const;

export interface EngineMeta {
  id: EngineId;
  emoji: string;
  name: string;          // 「章魚哥」
  shortName: string;     // 「章魚哥」
  title: string;         // 「神諭」
  description: string;
  accent: 'cyan' | 'emerald' | 'violet';
  color: string;
}

export interface Prediction {
  matchId: string;
  engine: EngineId;
  pick: PredictionPick;
  confidence: number;       // 0~1（=該選項機率）
  /** 完整三選一機率，用於圖示 / 對比 */
  probs: ProbabilityTriple;
  reasoning: string;        // 神諭文字
  pickedTeamName: string;   // 顯示用
  pickedTeamFlag: string;
  /** 是否為爆冷預警 */
  isUpsetAlert?: boolean;
  /** AI 戰術分析（如果有） */
  tacticalAnalysis?: string;
  /** LLM provider 標籤（有設 API key 時會帶） */
  source?: 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama';
  /** 章魚多玩法（大小 / 客進 / 上半場 / 波膽 / 總進球 / 讓分盤） */
  extras?: MultiMarketPicks;
}

/**
 * 章魚哥對「其他玩法」的選擇
 * - 每個欄位都帶 confidence (0-1) 與簡短理由
 * - 全部都是 optional，UI 沒拿到就不顯示
 */
export interface MultiMarketPicks {
  /** 大小（over/under 線） */
  overUnder?: {
    pick: 'OVER' | 'UNDER';
    line: number;
    confidence: number;
    reasoning?: string;
  };
  /** 讓分盤 */
  handicap?: {
    pick: 'HOME' | 'AWAY';
    line: number;          // 主隊 handicap
    confidence: number;
    reasoning?: string;
  };
  /** 客進（雙方都進球） */
  btts?: {
    pick: 'YES' | 'NO';
    confidence: number;
    reasoning?: string;
  };
  /** 上半場 1X2 */
  halfTime?: {
    pick: PredictionPick;
    confidence: number;
    reasoning?: string;
  };
  /** 正確比分 */
  correctScore?: {
    home: number;
    away: number;
    confidence: number;
    reasoning?: string;
  };
  /** 進球數區間 */
  totalGoals?: {
    label: string;         // '0-1' / '2-3' / '4-6' / '7+'
    confidence: number;
    reasoning?: string;
  };
}

export interface PredictionResult {
  prediction: Prediction;
  actual: PredictionPick | null;
  correct: boolean | null;
}

/** 模型校準品質指標 */
export interface CalibratedMetrics {
  /** Brier Score: (1/n) * Σ(prob_predicted - actual)²，範圍 0-1，越小越好 */
  brierScore: number;
  /** Log Loss: -1/n * Σ[y*log(p) + (1-y)*log(1-p)]，範圍 0-∞，越小越好 */
  logLoss: number;
}

/** 章魚哥的累積準確率 + 校準指標 */
export interface AccuracyBucket {
  total: number;
  evaluated: number;
  correct: number;
  accuracy: number;
  calibration?: CalibratedMetrics;
}
