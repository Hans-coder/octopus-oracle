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

export interface Prediction {
  matchId: string;
  pick: PredictionPick;
  confidence: number;       // 0~1
  reasoning: string;        // 章魚哥的「神諭」文字
  pickedTeamName: string;   // 顯示用
  pickedTeamFlag: string;
}

export interface PredictionResult {
  prediction: Prediction;
  actual: PredictionPick | null;
  correct: boolean | null;
}
