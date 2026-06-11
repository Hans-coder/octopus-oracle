import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';

/**
 * Server component — 偵測是否處於 mock 模式
 * - 沒設 FOOTBALL_DATA_API_TOKEN 或 USE_MOCK_DATA=true → 賽程是 mock
 * - USE_MOCK_DATA !== 'false'（預設 true）→ 賠率是 mock
 * - LLM_PROVIDER=mock 或無 API key → LLM 是 mock
 */
export default function MockDataBanner() {
  const noFootballToken = !process.env.FOOTBALL_DATA_API_TOKEN;
  const forceMock = process.env.USE_MOCK_DATA === 'true';
  const oddsIsMock = process.env.USE_MOCK_DATA !== 'false';
  const matchesIsMock = noFootballToken || forceMock;

  const provider = (process.env.LLM_PROVIDER ?? 'mock').toLowerCase();
  const llmIsMock =
    provider === 'mock' ||
    (provider === 'openai' && !process.env.OPENAI_API_KEY) ||
    (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY);

  // 任何一項是 mock 就要警告
  if (!matchesIsMock && !oddsIsMock && !llmIsMock) return null;

  const items: string[] = [];
  if (matchesIsMock) items.push('賽程');
  if (oddsIsMock) items.push('賠率');
  if (llmIsMock) items.push('AI 神諭');

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-[11px] sm:px-6">
        <div className="flex items-center gap-2 text-amber-200">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong className="font-semibold">展示模式：</strong>
            目前 <span className="font-mono">{items.join(' / ')}</span>{' '}
            為程式產生的擬真資料，與真實賽事無關
          </span>
        </div>
        <Link
          href="https://github.com/Hans-coder/octopus-oracle#-接真實資料"
          target="_blank"
          rel="noreferrer"
          className="hidden shrink-0 rounded-full border border-amber-400/40 px-2 py-0.5 font-medium text-amber-100 hover:bg-amber-400/20 sm:inline-block"
        >
          如何接真實 API →
        </Link>
      </div>
    </div>
  );
}
