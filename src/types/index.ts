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
  source: string;    // 資料來源（如「台灣運彩」）
  updatedAt: string; // ISO timestamp
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

/** 整場比賽的統計特徵（給 doctor / oracle 用） */
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
  provider: 'openai' | 'anthropic' | 'mock';
  generatedAt: string;
}

/** 三隻章魚哥的識別 */
export type EngineId = 'paul' | 'doctor' | 'oracle';

export const ENGINE_IDS: readonly EngineId[] = ['paul', 'doctor', 'oracle'] as const;

export interface EngineMeta {
  id: EngineId;
  emoji: string;
  name: string;          // 「章魚哥本人」
  shortName: string;     // 「章魚哥」
  title: string;         // 「直覺派」
  description: string;   // 「靠深海感應，可能翻盤」
  accent: 'cyan' | 'emerald' | 'violet';
  color: string;         // hex / tailwind hue
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
  /** LLM provider 標籤（僅 oracle 引擎使用） */
  source?: 'mock' | 'openai' | 'anthropic';
}

/** 一場比賽三隻章魚哥的完整預測 */
export interface PredictionBundle {
  matchId: string;
  paul: Prediction;
  doctor: Prediction;
  oracle: Prediction;
  /** 三者意見是否一致；不一致時 UI 會 highlight */
  consensus: PredictionPick | null;
}

export interface PredictionResult {
  prediction: Prediction;
  actual: PredictionPick | null;
  correct: boolean | null;
}

/** 單一引擎、單一分桶的命中率 */
export interface AccuracyBucket {
  total: number;
  evaluated: number;
  correct: number;
  accuracy: number;
}

/** 單一引擎在「正賽 / 熱身賽 / 全部」的成績 */
export interface EngineAccuracy {
  engine: EngineId;
  official: AccuracyBucket;
  friendly: AccuracyBucket;
  combined: AccuracyBucket;
}
