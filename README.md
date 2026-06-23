# 🐙 章魚哥神諭 · Octopus Oracle

> 以資料模型為核心，為 2026 FIFA 世界杯提供可追蹤的勝負預測與賠率推算。

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
- 📱 **Mobile-first UI**：資訊優先、低干擾、手機可讀版面

## 🚀 快速開始

```bash
npm install
npm run dev
```

打開 [http://localhost:3000](http://localhost:3000) 🎉
若要啟用 AI 分析，需設定 OpenAI 或 Anthropic API key；未設定時會停用 AI 分析。

## 🌐 資料來源

| 層 | 來源 | 需要 key? |
| --- | --- | --- |
| **賽程 / 比分 / 場地** | ESPN 隱藏公開 API (`site.api.espn.com`) | ❌ 完全不用 |
| **盤口（多玩法）** | 章魚推算盤（後端 Poisson xG 模型，見 `lib/markets.ts`） | ❌ 後端純算 |
| **AI 分析** | OpenAI / Anthropic（未設定 key 時停用） | ⚠️ 選填 |

> ⚠️ **為什麼不接台彩真實賠率？**
> 台灣運彩沒有開放 API，官網是 SPA + Cloudflare 擋爬蟲，技術上拿不到。
> 我們用 Poisson xG 模型 + 8% 派彩率回推「台彩風格」賠率，標示為「章魚推算盤」誠實呈現。

## ⚙️ 選填：啟用真實 LLM 神諭

若要啟用每場比賽的 AI 分析：

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
| 快取 | In-memory + Upstash Redis（選填） |
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
    ├── football-api.ts                # 賽程入口（呼叫 espn-api，失敗回傳空資料）
    ├── lottery-scraper.ts             # 章魚推算盤入口（呼叫 markets.ts）
    ├── markets.ts                     # Poisson xG 多玩法機率模型
    ├── elo.ts                         # 球隊 Elo 評分表
    ├── octopus.ts                     # 章魚哥預測引擎
    ├── team-stats.ts                  # 近期戰績 / H2H / 傷兵推算
    ├── llm-analyst.ts                 # LLM provider 整合（openai / anthropic）
    ├── page-data.ts                   # 三個 page 共用的 server 資料聚合
    └── redis.ts                       # Redis client（分散式快取）
```

## 🐙 章魚哥預測演算法

主玩法（1X2）混合三個來源：

```
P(home/draw/away) = odds 隱含機率 × 0.55
                  + Elo 推算機率 × 0.30
                  + 近期狀態加成 × 0.15
                  (+ LLM 機率 × 0.10 if available)
```

衍生玩法（大小 / 讓分 / 客進 / ...）用 Poisson xG：

1. 從 Elo 差推算 λ_home, λ_away（預期進球）
2. 雙重 Poisson sum 算各種市場機率
3. 章魚哥對大球 / 客進=YES 略有偏好（+3% 戲劇性）
4. 種子化 seeded random 確保同場永遠相同預測

## 🚢 部署到 Vercel

1. Push 到 GitHub
2. 在 [Vercel](https://vercel.com) 匯入專案
3. 直接 Deploy
4. 若要 AI 分析，設定 `LLM_PROVIDER` + `*_API_KEY`
5. 建議設定 `UPSTASH_REDIS_REST_URL` 與 `UPSTASH_REDIS_REST_TOKEN` 以避免重複運算

## ⚠️ 免責聲明

- 本網站僅供娛樂與技術示範用途
- 賠率為「章魚推算盤」並非台彩實時資料，請以台灣運彩官方資訊為準
- 未滿 18 歲請勿購買運彩
- 請理性觀賽，賭博可能成癮

---

🐙 致敬 Paul the Octopus (2008–2010) · 你永遠是我們心中最神準的神諭
