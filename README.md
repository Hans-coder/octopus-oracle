# 🐙 章魚哥神諭 · Octopus Oracle

> 致敬 Paul the Octopus！為 2026 FIFA 世界杯每場比賽提供深海神諭預測，**零設定 / 無需 API key** 即可運作。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan?logo=tailwindcss)

## ✨ 功能

- 🐙 **章魚哥神諭**：每場比賽召喚深海章魚哥，融合賠率隱含機率 + Elo 評分 + 近期狀態 + AI 文案
- 📅 **真實賽程**：透過 ESPN 公開 API 抓取 FIFA 2026 完整賽程、即時比分、場地
- 💰 **章魚推算盤**：用 Poisson xG 模型計算台彩主流玩法的「推算賠率」
  - 不讓分（主勝 / 和局 / 客勝）
  - 大小分 2.5
  - 讓分盤
  - 雙方均得分（是 / 否）
  - 上半場不讓分
  - 總進球數
  - 波膽 Top 6
- 🏆 **神準排行**：累計章魚哥的歷史準確率
- 🎨 **海洋風 UI**：深海漸層 + 氣泡動畫 + Framer Motion 觸手揭曉動畫

## 🚀 快速開始

```bash
npm install
npm run dev
```

打開 [http://localhost:3000](http://localhost:3000) 🎉
**完全不需要設定任何 API key**，賽程從 ESPN 拉、賠率由章魚推算。

## 🌐 資料來源

| 層 | 來源 | 需要 key? |
| --- | --- | --- |
| **賽程 / 比分 / 場地** | ESPN 隱藏公開 API (`site.api.espn.com`) | ❌ 完全不用 |
| **賠率（多玩法）** | 章魚推算盤（後端 Poisson xG 模型，見 `lib/markets.ts`） | ❌ 後端純算 |
| **AI 神諭文案** | 本機模板（8 種隨機句型）；可選擇接 OpenAI / Anthropic | ⚠️ 選填 |

> ⚠️ **為什麼不接台彩真實賠率？**
> 台灣運彩沒有開放 API，官網是 SPA + Cloudflare 擋爬蟲，技術上拿不到。
> 我們用 Poisson xG 模型 + 8% 派彩率回推「台彩風格」賠率，標示為「章魚推算盤」誠實呈現。

## ⚙️ 選填：啟用真實 LLM 神諭

預設用本機模板就很好玩了；如果想要每場都有獨特 AI 分析：

```bash
cp .env.local.example .env.local
```

打開 `.env.local`，三選一：

```dotenv
# 用 OpenAI（需先預付 $5）
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# 或用 Anthropic
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

設好後重啟 `npm run dev`，章魚哥的神諭就會變成真實 LLM 即時生成。

## 📦 技術架構

| 層 | 技術 |
| --- | --- |
| 框架 | Next.js 16 App Router + React 19 |
| 樣式 | Tailwind CSS v4 |
| 動畫 | Framer Motion |
| Icons | Lucide React |
| 數學模型 | Poisson xG + Elo 評分 |
| 部署 | Vercel（含 ISR `revalidate: 300`） |

## 🗂️ 專案結構

```
src/
├── app/
│   ├── api/
│   │   ├── matches/route.ts           # GET /api/matches
│   │   ├── odds/route.ts              # GET /api/odds
│   │   ├── predictions/route.ts       # GET /api/predictions
│   │   ├── cron/update-odds/          # 定時更新賠率（選用）
│   │   └── cron/llm-analyze/          # LLM 暖機（選用）
│   ├── matches/page.tsx               # 全部賽程頁
│   ├── leaderboard/page.tsx           # 神準排行榜
│   └── page.tsx                       # Dashboard 首頁
├── components/
│   ├── Navigation.tsx
│   ├── MatchCard.tsx
│   ├── OctopusPredictor.tsx           # 章魚哥揭曉動畫
│   ├── OddsDisplay.tsx                # 章魚推算盤展示
│   └── StatCard.tsx
└── lib/
    ├── espn-api.ts                    # ESPN 公開 API 整合
    ├── football-api.ts                # 賽程入口（呼叫 espn-api，失敗 fallback mock）
    ├── lottery-scraper.ts             # 章魚推算盤入口（呼叫 markets.ts）
    ├── markets.ts                     # Poisson xG 多玩法機率模型
    ├── elo.ts                         # 球隊 Elo 評分表
    ├── octopus.ts                     # 章魚哥預測引擎
    ├── team-stats.ts                  # 近期戰績 / H2H / 傷兵推算
    ├── llm-analyst.ts                 # LLM provider 整合（mock / openai / anthropic）
    ├── page-data.ts                   # 三個 page 共用的 server 資料聚合
    └── mock-data.ts                   # ESPN 掛掉時的 fallback 賽程
```

## 🐙 章魚哥預測演算法

主玩法（1X2）混合三個來源：

```
P(home/draw/away) = odds 隱含機率 × 0.55
                  + Elo 推算機率 × 0.30
                  + 近期狀態加成 × 0.15
                  (+ LLM 機率 × 0.10 if available)
```

衍生玩法（大小分 / 讓分盤 / BTTS / ...）用 Poisson xG：

1. 從 Elo 差推算 λ_home, λ_away（預期進球）
2. 雙重 Poisson sum 算各種市場機率
3. 章魚哥對 OVER / BTTS=YES 略有偏好（+3% 戲劇性）
4. 種子化 seeded random 確保同場永遠相同預測

## 🚢 部署到 Vercel

1. Push 到 GitHub
2. 在 [Vercel](https://vercel.com) 匯入專案
3. 直接 Deploy（**不需要設任何環境變數**）
4. 想用真實 LLM 才設 `LLM_PROVIDER` + `*_API_KEY`

## ⚠️ 免責聲明

- 本網站僅供娛樂與技術示範用途
- 賠率為「章魚推算盤」並非台彩實時資料，請以台灣運彩官方資訊為準
- 未滿 18 歲請勿購買運彩
- 請理性觀賽，賭博可能成癮

---

🐙 致敬 Paul the Octopus (2008–2010) · 你永遠是我們心中最神準的神諭
