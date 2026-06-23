'use client';

import { useEffect, useState } from 'react';

interface AccuracyRecord {
  matchId: string;
  pickedTeam: string;
  picked: string;
  actual: string;
  correct: boolean | null;
  confidence: number;
  evaluatedAt: string;
}

interface RecordsData {
  stats: {
    total: number;
    evaluated: number;
    correct: number;
    accuracy: number;
  };
  records: AccuracyRecord[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export function PredictionRecords() {
  const [data, setData] = useState<RecordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetch_data = async () => {
      try {
        const res = await fetch(`/api/accuracy-records?limit=20&offset=${page * 20}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('[PredictionRecords]', err);
      } finally {
        setLoading(false);
      }
    };

    fetch_data();
  }, [page]);

  if (loading || !data) {
    return <div className="text-center text-slate-400">載入中...</div>;
  }

  const { stats, records, pagination } = data;

  const getResultSymbol = (actual: string) => {
    if (actual === 'HOME') return '主';
    if (actual === 'AWAY') return '客';
    if (actual === 'DRAW') return '和';
    return '—';
  };

  const getPickSymbol = (pick: string) => {
    if (pick === 'HOME') return '主';
    if (pick === 'AWAY') return '客';
    if (pick === 'DRAW') return '和';
    return '—';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-cyan-500/30 bg-slate-900/40 p-3 backdrop-blur">
          <p className="text-xs text-slate-400">累積預測</p>
          <p className="text-xl font-bold text-cyan-300">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-slate-900/40 p-3 backdrop-blur">
          <p className="text-xs text-slate-400">已評估</p>
          <p className="text-xl font-bold text-emerald-300">{stats.evaluated}</p>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-slate-900/40 p-3 backdrop-blur">
          <p className="text-xs text-slate-400">命中</p>
          <p className="text-xl font-bold text-green-300">{stats.correct}</p>
        </div>
        <div className="rounded-lg border border-blue-500/30 bg-slate-900/40 p-3 backdrop-blur">
          <p className="text-xs text-slate-400">準確率</p>
          <p className="text-xl font-bold text-blue-300">
            {stats.evaluated === 0 ? '—' : `${Math.round(stats.accuracy * 100)}%`}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/30 backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/50">
              <th className="px-3 py-2 text-left font-semibold text-cyan-300">預測球隊</th>
              <th className="px-3 py-2 text-center font-semibold text-cyan-300">預測</th>
              <th className="px-3 py-2 text-center font-semibold text-cyan-300">信心度</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-300">結果</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-300">正確</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.matchId}
                className={`border-b border-slate-700/50 hover:bg-slate-800/50 transition ${
                  record.correct === true
                    ? 'bg-green-900/20'
                    : record.correct === false
                      ? 'bg-red-900/20'
                      : 'bg-slate-900/20'
                }`}
              >
                <td className="px-3 py-2 text-slate-200">
                  <div className="text-sm font-medium">
                    {record.pickedTeam}
                  </div>
                  <div className="text-xs text-slate-400">
                    {record.evaluatedAt}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-block rounded bg-slate-800/60 px-2 py-1 text-xs font-semibold text-cyan-300">
                    {getPickSymbol(record.picked)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-slate-300">
                  {record.confidence}%
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-block rounded bg-slate-800/60 px-2 py-1 text-xs font-semibold text-slate-300">
                    {getResultSymbol(record.actual)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {record.correct === true ? (
                    <span className="inline-block rounded-full bg-green-500/30 px-2 py-0.5 text-xs font-semibold text-green-300">
                      ✓
                    </span>
                  ) : record.correct === false ? (
                    <span className="inline-block rounded-full bg-red-500/30 px-2 py-0.5 text-xs font-semibold text-red-300">
                      ✗
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.total > pagination.limit && (
        <div className="flex justify-between items-center text-xs text-slate-400">
          <p>
            顯示 {page * pagination.limit + 1} 到{' '}
            {Math.min((page + 1) * pagination.limit, pagination.total)} /
            共 {pagination.total} 筆
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded border border-slate-600 px-2 py-1 hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              上一頁
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasMore}
              className="rounded border border-slate-600 px-2 py-1 hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
