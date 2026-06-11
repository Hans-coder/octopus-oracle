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

## ⚠️ 免責聲明

- 本網站僅供娛樂與技術示範用途
- 賠率資訊不保證即時準確，請以台灣運彩官方資訊為準
- 未滿 18 歲請勿購買運彩
- 請理性觀賽，賭博可能成癮

---

🐙 致敬 Paul the Octopus (2008–2010) · 你永遠是我們心中最神準的神諭
