# FlashGrid 閃記方格

**線上試玩：<https://arvinyang1925.github.io/FlashGrid/>**

黃色格子亮幾秒，記住它們的位置；棋盤轉暗後把剛才亮過的格子全部點回來。
同一關連續點錯 2 次，還沒找到的格子會再閃一次當提示。
連續點對會累積連擊倍率，最高 ×3。

Vite + Vue 3 + TypeScript + 原生 CSS，沒有 UI 框架、沒有音檔、沒有後端。
把網址貼到 LINE、Threads、Discord 或 Facebook 會自動展開成預覽卡。

## 三種模式

| 模式     | 內容                                                                     |
| -------- | ------------------------------------------------------------------------ |
| 經典     | 8 關，4 → 11 格，每次都是新盤面。點錯只扣分、不扣生命                    |
| 每日挑戰 | 用日期當亂數種子，同一天全世界拿到同一盤。每天記一次成績，並累計連續天數 |
| 無盡     | 格數一路加到 18 格、記憶時間一路縮到 1.5 秒，3 條命用完就結束            |

每日挑戰的成績在「整局打完」時才寫進去，中途離開可以重來。所有紀錄都存在瀏覽器的
`localStorage`，沒有伺服器也沒有排行榜。

## 開發

```bash
npm install
npm run dev       # 開發伺服器
npm test          # Vitest 單元測試
npm run lint      # ESLint
npm run format    # Prettier
npm run build     # 型別檢查 + 產出 dist/
npm run preview   # 預覽 build 結果
```

## 專案結構

```
src/
├─ game/
│  ├─ config.ts       關卡、模式、連擊與計分的所有常數（要調難度改這裡）
│  ├─ rng.ts          可注入種子的亂數產生器（mulberry32）
│  ├─ daily.ts        每日挑戰：日期換算、題號、固定種子
│  ├─ logic.ts        純函式：選格、計分、連擊倍率、各模式的關卡曲線
│  ├─ scoreCard.ts    把成績畫成一張 1080×1080 的 PNG（純 canvas 繪圖）
│  └─ *.test.ts       對應的單元測試
├─ composables/
│  ├─ useGame.ts      遊戲狀態機（idle → memorize → recall → …）
│  ├─ useGame.test.ts 狀態機的單元測試，用假時間跑完整局
│  ├─ useScoreCard.ts 產生成績卡並交給系統分享面板或下載
│  ├─ useSound.ts     Web Audio 即時合成音效，不需要任何音檔
│  └─ useI18n.ts      中／英雙語文案
├─ components/
│  ├─ GameBoard.vue   5×5 格線
│  ├─ TileCard.vue    單一格子，CSS 3D 翻牌
│  ├─ HudBar.vue      標題列與計分板
│  ├─ StartOverlay.vue 模式選單
│  └─ ResultOverlay.vue 結算與成績卡
└─ App.vue

public/
├─ og.png             1200×630 社群預覽圖
├─ favicon.svg        分頁圖示
└─ apple-touch-icon.png  加到主畫面時的圖示
```

`public/` 的檔案會原封不動複製到 `dist/` 根目錄。`index.html` 的 `og:image` 走絕對網址，
因為爬蟲不會照著相對路徑走；換網域時記得一起改。

## 計分

| 項目       | 說明                                                                  |
| ---------- | --------------------------------------------------------------------- |
| 基礎分     | 該關格數 × 100                                                        |
| 零失誤獎勵 | +200                                                                  |
| 速度獎勵   | 每格 0.9 秒內完成拿滿 300，之後每 20ms 少 1 分                        |
| 連擊獎勵   | 每格 40 ×（倍率 − 1）；倍率在連續 3／5／8／12 格時升到 1.5／2／2.5／3 |
| 失誤扣分   | 每次 −50（單關最低 0 分，不會扣到負的）                               |

連擊跨關不會斷，點錯才歸零。基礎分與速度獎勵的算法沒有變，連擊是額外加上去的。

## 想改難度？

`src/game/config.ts` 裡：

- `START_TILES`、`TOTAL_LEVELS`、`MEMORIZE_MS`、`BOARD_SIZE` — 經典與每日的關卡曲線
- `HINT_AFTER_MISSES`、`HINT_MS` — 連錯幾次給提示、提示亮多久
- `ENDLESS_MAX_TILES`、`ENDLESS_MEMORIZE_STEP_MS`、`ENDLESS_MIN_MEMORIZE_MS`、`ENDLESS_MAX_MISSES` — 無盡模式
- `COMBO_TIERS`、`COMBO_BONUS_PER_TILE` — 連擊倍率與獎勵
- `DAILY_EPOCH` — 每日挑戰 #1 是哪一天

改完 `npm test` 會驗證關卡曲線單調、格數不超過棋盤、連擊分段由高到低排好，以及每日挑戰
同一天重跑會拿到同一盤。

## 部署

push 到 `main` 後由 `.github/workflows/deploy.yml` 自動建置並發佈到 GitHub Pages：
<https://arvinyang1925.github.io/FlashGrid/>
（repo 的 Settings → Pages 已把 Source 設成 GitHub Actions，換 repo 時要重設一次）。
`vite.config.ts` 用相對 `base`，子路徑部署不用再改設定。
