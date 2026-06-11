# 🐙 章魚哥神諭 · Octopus Oracle

> 致敬 Paul the Octopus！為 2026 FIFA 世界杯每場比賽提供深海神諭預測，整合台灣運彩賠率，純娛樂用途。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan?logo=tailwindcss)

## ✨ 功能

- 🐙 **章魚哥預測**：對每場比賽產生「神諭」式預測（結合賠率權重 + 30% 混沌因子）
- 📅 **完整賽程**：自動拉取 2026 世界杯所有賽事（含小組賽 / 淘汰賽）
- 💰 **台灣運彩賠率**：定時更新主勝 / 和局 / 客勝賠率
- 🏆 **神準排行**：累計章魚哥的歷史準確率
- 🎨 **海洋風 UI**：深海漸層 + 氣泡動畫 + 純 SSR (App Router + ISR)

## 🚀 快速開始

```bash
# 安裝依賴
npm install

# 啟動開發伺服器（預設用 mock 資料，立刻能跑）
npm run dev
```

打開 [http://localhost:3000](http://localhost:3000) 即可看到首頁 🎉

## ⚙️ 設定真實 API

複製 `.env.local.example` 為 `.env.local`：

```bash
cp .env.local.example .env.local
```

| 環境變數 | 說明 |
| --- | --- |
| `FOOTBALL_DATA_API_TOKEN` | [football-data.org](https://www.football-data.org/) 免費 API token（10 req/min） |
| `FOOTBALL_COMPETITION_ID` | 競賽 ID，預設 `WC`（World Cup） |
| `CRON_SECRET` | Vercel Cron Job 的驗證金鑰 |
| `USE_MOCK_DATA` | `true` 強制使用 mock 資料；不設定或 `false` 則嘗試呼叫真實 API |

## 📦 技術架構

| 層 | 技術 |
| --- | --- |
| 框架 | Next.js 16 App Router + React 19 |
| 樣式 | Tailwind CSS v4 |
| 動畫 | Framer Motion |
| Icons | Lucide React |
| 爬蟲 | cheerio |
| 部署 | Vercel（含 Cron Jobs） |

## 🗂️ 專案結構

```
src/
├── app/
│   ├── api/
│   │   ├── matches/route.ts        # GET /api/matches
│   │   ├── odds/route.ts           # GET /api/odds
│   │   ├── predictions/route.ts    # GET /api/predictions
│   │   └── cron/update-odds/       # 定時更新賠率
│   ├── matches/page.tsx            # 全部賽程頁
│   ├── leaderboard/page.tsx        # 神準排行榜
│   ├── page.tsx                    # Dashboard 首頁
│   └── layout.tsx
├── components/
│   ├── Navigation.tsx
│   ├── MatchCard.tsx
│   ├── OctopusPredictor.tsx
│   ├── OddsDisplay.tsx
│   └── StatCard.tsx
├── lib/
│   ├── football-api.ts             # football-data.org 整合
│   ├── lottery-scraper.ts          # 台彩運彩爬蟲
│   ├── octopus.ts                  # 章魚哥預測引擎
│   ├── mock-data.ts                # 模擬資料
│   └── utils.ts
└── types/index.ts
```

## 🐙 章魚哥預測演算法

1. **賠率轉機率**：將主勝 / 和局 / 客勝賠率轉為隱含機率（含 1.08 莊家抽水修正）
2. **混沌因子**：將真實機率與均勻分布混合（70% 真實 + 30% 隨機）—— 保留章魚哥的神祕性與翻盤可能性
3. **種子化抽樣**：用比賽 ID 作為種子，同場比賽永遠得到相同預測，避免畫面亂跳
4. **戲劇性文案**：隨機產生 8 種章魚哥神諭風格描述

## 🚢 部署到 Vercel

1. Push 到 GitHub
2. 在 [Vercel](https://vercel.com) 匯入專案
3. 設定環境變數（同上表）
4. Deploy！Cron Jobs 會自動每 30 分鐘執行 `/api/cron/update-odds`

## 🌐 接真實資料

> **預設使用 mock 資料**：因為下列限制，本專案出廠預設用程式產生的擬真資料運作，頂部會跳出黃色橫幅提醒。

### ⛔ 為什麼預設是 Mock？

| 來源 | 狀態 | 原因 |
| --- | --- | --- |
| `football-data.org`（免費版） | ❌ 不支援世界杯 | WC 競賽資料僅開放給付費方案（Tier 2 起，€49/月） |
| 台彩運彩官網 | ❌ 爬不到 | 賠率頁是 SPA，cheerio 拿到空 HTML，需要 headless browser |
| LLM 神諭 | ⚠️ 需要 API Key | 沒設 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` 就 fallback 到 mock |

### ✅ 解決方案

#### 方案 A：API-Football（推薦，免費版就支援 WC）

[api-sports.io](https://www.api-football.com/) 免費版每天 100 calls，**包含 2026 世界杯所有資料**。

```bash
# .env.local
API_FOOTBALL_KEY=你的_key
USE_MOCK_DATA=false
```

需要改寫 `src/lib/football-api.ts` 的 `fetchMatches()`：

```ts
const res = await fetch(
  'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
  { headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! } }
);
```

#### 方案 B：TheSportsDB（完全免費，無需 key）

[thesportsdb.com](https://www.thesportsdb.com/free_sports_api) 完全免費，資料較粗但夠用：

```ts
// FIFA World Cup id = 4429
const res = await fetch(
  'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026'
);
```

#### 方案 C：ESPN 隱藏端點（無需 key，會被擋）

```ts
const res = await fetch(
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
);
```

非官方，量大會被 rate limit，**僅供本機測試**。

#### 方案 D：真實賠率

台彩運彩 SPA 抓不到，可改用：

- [**The Odds API**](https://the-odds-api.com/) — 免費 500 req/月，含 `soccer_fifa_world_cup`
- [**OddsPortal**](https://www.oddsportal.com/) — 需要 Playwright headless browser

把 `src/lib/lottery-scraper.ts` 的 `fetchOddsForMatch()` 改成呼叫 The Odds API：

```ts
const res = await fetch(
  `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=eu&markets=h2h`
);
```

#### LLM 神諭真實化

```bash
# .env.local
LLM_PROVIDER=openai          # 或 anthropic
OPENAI_API_KEY=sk-...
# 或
ANTHROPIC_API_KEY=sk-ant-...
```

設好後，章魚博士 🦑 與深海神諭 🐙‍🌊 會用真實 LLM 分析球隊近況、傷兵、心理層面，產出個性化神諭。

### 🎯 確認接上真實資料

當所有 mock 都關掉後，**頂部黃色橫幅會自動消失**。
打開 DevTools Network，應該看到對 `api-football.io` / `the-odds-api.com` / `api.openai.com` 的請求。

## ⚠️ 免責聲明

- 本網站僅供娛樂與技術示範用途
- 賠率資訊不保證即時準確，請以台灣運彩官方資訊為準
- 未滿 18 歲請勿購買運彩
- 請理性觀賽，賭博可能成癮

---

🐙 致敬 Paul the Octopus (2008–2010) · 你永遠是我們心中最神準的神諭
