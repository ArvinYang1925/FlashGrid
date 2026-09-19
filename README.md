# FlashGrid 閃記方格

**線上試玩：<https://arvinyang1925.github.io/FlashGrid/>**

黃色格子亮 3 秒，記住它們的位置；棋盤轉暗後把剛才亮過的格子全部點回來。
共 8 關，從 4 格到 11 格，點錯只扣分、不扣生命。
同一關連續點錯 2 次，還沒找到的格子會再閃一次當提示。

Vite + Vue 3 + TypeScript + 原生 CSS，沒有 UI 框架、沒有音檔。

## 開發

```bash
npm install
npm run dev       # 開發伺服器
npm test          # Vitest 單元測試（遊戲邏輯）
npm run lint      # ESLint
npm run format    # Prettier
npm run build     # 型別檢查 + 產出 dist/
npm run preview   # 預覽 build 結果
```

## 專案結構

```
src/
├─ game/
│  ├─ config.ts      關卡與計分的所有常數（要調難度改這裡）
│  ├─ logic.ts       純函式：選格、計分、評價
│  └─ logic.test.ts  對應的單元測試
├─ composables/
│  ├─ useGame.ts     遊戲狀態機（idle → memorize → recall → …）
│  ├─ useGame.test.ts 狀態機的單元測試（連錯提示，用假時間）
│  ├─ useSound.ts    Web Audio 即時合成音效，不需要任何音檔
│  └─ useI18n.ts     中／英雙語文案
├─ components/
│  ├─ GameBoard.vue  5×5 格線
│  ├─ TileCard.vue   單一格子，CSS 3D 翻牌
│  ├─ HudBar.vue     標題列與計分板
│  ├─ StartOverlay.vue
│  └─ ResultOverlay.vue
└─ App.vue
```

## 計分

| 項目       | 說明                                                |
| ---------- | --------------------------------------------------- |
| 基礎分     | 該關格數 × 100                                      |
| 零失誤獎勵 | +200                                                |
| 速度獎勵   | 每格 0.9 秒內完成拿滿 300，之後每 20ms 少 1 分      |
| 失誤扣分   | 每次 −50（單關最低 0 分，不會扣到負的，也不扣生命） |

最高分存在瀏覽器的 `localStorage`。

## 想改難度？

`src/game/config.ts` 裡：`START_TILES`（起始格數）、`TOTAL_LEVELS`（關卡數）、
`MEMORIZE_MS`（記憶秒數）、`BOARD_SIZE`（棋盤邊長）、`HINT_AFTER_MISSES`（連錯幾次
給提示）、`HINT_MS`（提示亮多久）。改完 `npm test` 會驗證最後一關的格數仍然少於
總格數，以及連錯提示的觸發與收回。

## 部署

push 到 `main` 後由 `.github/workflows/deploy.yml` 自動建置並發佈到 GitHub Pages：
<https://arvinyang1925.github.io/FlashGrid/>
（repo 的 Settings → Pages 已把 Source 設成 GitHub Actions，換 repo 時要重設一次）。
`vite.config.ts` 用相對 `base`，子路徑部署不用再改設定。
