# TITAN-STAR 變更紀錄

由 `AI-HANDOFF.md` 拆出（2026-09-30）。交接文件只保留現況與規則，歷次版本說明與各輪優化紀錄放在這裡。新到舊。

## 版本歷史

- `20261001-2` 型號分析視窗修正與月份篩選（Claude）：
  - 修正型號分析視窗按 ✕／點遮罩／Esc 後仍殘留在畫面上：置中版型的關閉狀態仍落在可視範圍，改為關閉時 `opacity:0`、`visibility:hidden`。
  - 修正零件名稱顯示成 `<span class="pdb-spec">…</span>` 原始碼：`pdbLabel()` 回傳 HTML 卻又被 `escapeHtml` 一次。新增純文字版 `pdbText()` 給 title 屬性使用。
  - 頂部「型號查詢」新增月份下拉（最新月份／各月份／全部月份累計），查詢時套用該月份；查詢中切換月份會直接重查。原本固定只看最新月份。
  - 型號分析視窗的「故障原因落點」與「最近維修紀錄」改為跟著目前月份（原本固定用全部月份，和零件區塊口徑不一致）。月份列新增「全部月份」分頁。
- `20261001-1` 搬遷到新倉庫（Claude）：正式倉庫由 `Campcool/TITAN-STAR` 改為 `jianjr01-pixel/TITAN-STAR`，網站改為 `https://jianjr01-pixel.github.io/TITAN-STAR/`。
  - `monthly-source.js` 改到新倉庫的 `date/` 讀取每月 Excel。
  - Worker 的 `ALLOWED_ORIGIN`、`GITHUB_OWNER` 改為新帳號。
  - 文件與測試裡的網址同步更新。
  - 以下的舊版本說明保留原本的 Campcool 網址，未改寫。
- `20260930-1` 安全與分析口徑修正（Claude）：
  - 公開 `data.json` 移除 `users`（原含 15 組帳號與密碼雜湊，其中 14 組密碼等於帳號）。舊版 localStorage 帳號清單開頁時清除。
  - 登入改由 Cloudflare Worker + D1 驗證（`worker/`），加入失敗鎖定、改密碼後其他登入失效，以及管理員操作紀錄。
  - 後台畫面全面跳脫 HTML。上傳檔名規則與 `monthly-source.monthInfo` 一致，並檢查 .xlsx 簽章。
  - 移除舊的免密碼 `window.Auth`（寫死員工全名），改為 `window.TitanUI`，只保留快捷鍵、通知與延遲載入圖表。
  - `build.js` 內嵌 `auth-config.js`／`auth-worker.js`。錨點檢查要求本地資源帶 `?v=`；CI 語法檢查擴大到 19 支。Worker 網址未設定時擋下部署。
  - 分析修正：SPC 改為依各月樣本數計算界限的 p-chart，過度離散時自動改用 Laney p′。DPPM／FPY 標示為代理值；重工率排除生產序號（批號）。熱圖的零件欄位改讀 part1–3（原本讀不存在的 `r.parts`，恆為 0%）。
  - 封存 `TITAN-STAR-morandi.html`（2026-09-07 以後未同步的舊版單檔）至 `archive/`；版本歷史移至本檔。
- `20260907-7` 雙 Excel 自動更新（Codex）：`date` 同時辨識每月維修報表與整新故障表，
  維修表更新 RMA 月資料，整新故障表更新無線機種整新測試、故障及原因碼歷史。
  瀏覽器日期物件與 Excel 日期序號均正規化；同月兩種類型分開做更正版與 SHA 判斷。
- `20260907-6` 操作提示（Codex）：把「+CAPA」改為「建立 CAPA 追蹤」，加入支援 hover、
  鍵盤 focus 與手機點選的用途說明；CAPA 抽屜開頭解釋適用情況與建立後好處。
  KPI、下鑽、期間、更新及三步閱讀入口同步加入簡短用途提示。
- `20260907-5` 主管摘要互動節奏（Codex）：四張 KPI 改為真正的內容篩選器，選取後更新
  明確狀態、解釋、分組及排序；手機入口改為 2×2。抽屜加入 dialog 語意、Tab 焦點循環與
  關閉後焦點還原。以 1440、768、390px 驗證四種選擇及抽屜往返。
- `20260907-4` 載入畫面可讀性（Codex）：深色遮罩改為獨立高對比色彩，放大載入圖示、
  主標與說明文字，並以 1440、768、390px 實際渲染確認無溢出或截字。
- `20260907-3` 作業口徑標示（Codex）：月份、大類、機種與收合摘要均顯示完整流程名稱；
  分析期間說明明示兩者是不同作業數量，避免使用者把 101,624 與 6,587 誤認為同一母體。
- `20260826-1` 設計令牌三層架構（Claude，依 `Campcool/AI-skill` 的 `uiux-design`）：
  三個 CSS 檔的 1,260 條硬編數值改為 token 引用，**逐一位置比對數值不符 0**、
  681 個元素 computed style 完全一致。詳見文末「設計令牌三層架構」。
- `20260825-1` 離線 bundle 可重現門禁（Codex）：定位 GitHub Actions 每次都警告
  `TITAN-STAR.html` 不同步的根因為 Windows CRLF／Linux LF 差異；`build.js` 現在於讀入
  每個文字來源時統一 LF，包含先正規化再 `JSON.stringify` 的莫蘭迪 CSS。Windows 連跑兩次
  產物皆為 842,173 bytes、SHA256 `EA63ECD6898831CC1BDA138425B1C95B6870044CB979AB550EC2FF6C421C1E7C`。
  CI 已將永遠成功的 `git diff ... || echo warning` 改為差異時 `exit 1`；反例修改 CSS 後
  實測退出碼 1，恢復後退出碼 0。同一 PR 並將 GitHub 官方 Action 升至 Node 24 世代：
  `checkout@v7`、`setup-node@v7`、`configure-pages@v6`、
  `upload-pages-artifact@v5`、`deploy-pages@v5`；網站測試用 Node 版本仍為 22。
- `20260822-1` Pages artifact 公開範圍收斂（Codex）：實測 `AI-HANDOFF.md` 與
  `AI-REVIEW-PROMPT.md` 在線上皆為 HTTP 200；新增 `scripts/prepare-pages-artifact.sh`，
  PR check 與 deploy 以明確公開白名單建立 `_site`，未列入白名單的 AI 文件、維修報表、
  維修記錄模板、測試及建置工具預設不發佈。`data.json`、網站 HTML／JS／CSS 與 PWA manifest
  仍明確保留。本 PR 只改 Actions artifact；Pages `build_type` 目前仍為 `legacy`，合併後
  線上發佈內容不會改變，必須另外把 Pages Source 切到 GitHub Actions 才會生效。
- `20260821-1` Pages 部署門禁 PR（Codex）：依 `Campcool/AI-skill` 跨倉庫優化專案 P0-1，
  將 `.github/workflows/site-check.yml` 從純 Site check 升級為 `Validate and deploy to GitHub Pages`。
  PR 仍只跑既有 JS 語法、pnpm 測試、去識別化、版本錨點與離線 bundle build 檢查；main push 通過後才執行
  `actions/deploy-pages`。此變更需搭配 GitHub Pages 設定從 legacy branch deploy 改為 GitHub Actions workflow；
  合併後再切換 Pages source。本輪只改 workflow 與交接文件，未改資料、登入、noindex 或 UI。
- `20260817-3` 加 noindex（Claude）：`index.html` / `TITAN-STAR.html` /
  `TITAN-STAR-morandi.html` 三個頁面加上 `<meta name="robots" content="noindex,nofollow">`，
  並新增 `internal tool pages carry noindex` 斷言防止被改掉（防假綠已驗）。
  **詳細背景與未解決的部分見下方「公開曝光現況」章節——這一步只是止血，不是保護。**
- `20260817-2` 斷言取樣範圍規則（Claude）：`tests/data-integrity.test.mjs` 檔頭新增
  「取樣範圍必須印出來」規則，各測試改用 `t.diagnostic()` 回報實際驗了幾筆。
  規則本身很小，但套上去立刻暴露三件原本看不見的事：
  - **原本 13 項全過，其中 2 項從來沒驗過任何東西**。`parser.normalizePart merges
    synonym variants` 與 `parser date parsing tolerates common formats` 都在找不到
    對應函式時直接 `return`，被計為 pass。而 `RepairDB` 的公開介面只有
    load/save/addMonth/removeMonth/clear，那些解析函式在內部 IIFE 不公開——
    所以它們從加進來的第一天起就是空的。已改為 `t.skip()` 並附原因，
    現在誠實顯示 **11 pass / 2 skipped**。CI 不會因 skipped 失敗，但看得見了。
  - `partsMaster` 測試名稱寫 "entries are well-formed"，實際只驗前 200 筆
    （共 8,996 筆）。取樣上限保留（全驗會拖慢 CI），但改為印出
    「200/8996（取樣上限 200，其餘未驗）」。
  - `modelSupplements` 原本 `slice(0, 13)` 剛好等於現有機種數，看起來像全驗，
    但機種一增加就會靜默漏掉新的。機種數是十位數等級不需取樣，已改為全驗。
  - 另註明 `publishedAt is recent ISO timestamp` 只驗格式沒驗新舊，測試名稱的
    "recent" 沒有對應斷言（僅在 diagnostic 標示，未改行為）。
- `20260817-1` 清理殘留（Claude 交叉複驗）：刪 `scripts/_gen-synthetic-month.py`
  與 `package-lock.json`。
  - `_gen-synthetic-month.py` 的檔頭第一行自己就寫著「不進版控」，卻在版控裡；
    `.gitignore` 只有 `node_modules/` 沒排除它；全 repo（CI、tests、package.json）
    **無任何引用**；且它 `import openpyxl`，而 CI 完全沒有 Python 環境。
    三個條件同時成立 = 死工具。import pipeline 測試用的是 `monthly-reports/`
    底下的真實 Excel，不需要這支合成產生器。
  - `package-lock.json` 與 `pnpm-lock.yaml` 並存，但 CI 只跑 `pnpm install`
    （site-check.yml 的註解也寫明「由 pnpm-lock 凍結版本確保可重現」），
    npm 那份從未被使用。兩份 lockfile 並存的唯一效果是讓人不確定該用哪個、
    以及兩者版本悄悄漂移。保留 pnpm-lock.yaml（lockfileVersion 9.0）。
    README「先執行一次 `npm install`」已同步改為 `pnpm install`。
- `20260816-1` 滿分制第二輪（Manus）：新增 `tests/import-pipeline.test.mjs`（4 項：真實月度 Excel dry-run 結構驗證、合併後 analyzer 管線產出、實際寫入 data.json 副本、損壞 workbook 失敗斷言防假綠）；CI（site-check.yml）在測試步驟前新增 `pnpm install`（import pipeline 測試依賴 xlsx，原 workflow 只在 build 步驟安裝，會造成新測試在 CI 上靜默爆掉）。這個 CI 診斷是對的——原 workflow 確實會讓新測試靜默失敗。
- `20260724-2` RWD 與可讀性：修正手機頂列被壓縮（rma-styles.css 串接順序問題）、整體字級上調一級。
- `20260723-5` 第二輪盤點：非料件字串分離、共同機種切換、警示已讀狀態、粉紅流光。
- `20260723-2` 序號語意修正（維修課確認）：生產序號＝製令批次號，不是機器序號；重複＝同批次而非重複維修。已改為 info 警示並新增製令落點分析。
- `20260723-1` 盤點優化：型號別名解析層、記錄瘦身、查詢快取、異常訊噪比校準（詳見文末「優化紀錄」）。
- `2026-07 資料`：匯入 115年7月主維修報表（+1,179 筆）、ZBRT050 補充（更新至 7 月）、無線多機種一覽表（+12 機種 modelSupplements）。
- `20260722-4` hotfix：修正部分瀏覽器登入後資料空白。雲端 data.json 現在即使 localStorage 寫入失敗，也會用 session 內的 cloudDb 直接顯示，並在 dashboard 空資料時自動重試同步。
- `20260722-3` UX：整站閱讀優化，統一卡片/表格/摘要卡/異常卡/抽屜/篩選列/側欄/手機版字級與間距（非只針對 ZBRT050）。
- `20260722-2` UX：型號補充抽屜把「整新測試數 / 整新測試故障 / 年度故障分佈總數」拆成不同色卡。年度 7,217 是歷史年度分佈，不與整新測試故障率混算。
- `20260722-1`：新增 `modelSupplements` 資料與匯入腳本（首個機種 ZBRT050）。

---

# 各輪優化紀錄（原 AI-HANDOFF.md 章節，內容未改）

### Claude 審查紀錄（2026-07-17）

Claude 依本文件審查 Codex 的型號查詢實作後，修正 3 個 bug。
修正 commit：`32e5293`，快取版本 `20260716-5 → 20260717-1`。以下逐項記錄「為什麼改」與「怎麼改」。

#### 修正 1：跨頁搜尋沒反應（嚴重，UI 流程）

- **位置**：`app.js` → `quickModelSearch(raw, opts)`
- **原因**：原寫法只設 `state.currentPage = 'summary'` 再 `renderAll()`。`renderAll → renderPage` 只負責「渲染內容」，不負責「切換哪個 `.page` 可見」— 可見性由 `switchPageDom()` 控制（切 `.page.active` class、導覽高亮、history）。所以使用者只要不是已經停在摘要頁（例如在總覽、零件 Pareto 頁）輸入型號，結果會渲染進 `display:none` 的 `#pageSummary`，畫面看起來完全沒反應 — 正是本文件「已知坑」裡最忌諱的「按了沒反應」。
- **修改方式**：搜尋命中後改為：
  - 若 `state.currentPage !== 'summary'`：先 `history.pushState({__page:'summary'})`（手機返回鍵可回原頁），再呼叫 `switchPageDom('summary')`（內含 renderPage），最後補跑 `renderFilters` 與 `updateSubbarSummary` 同步篩選列。
  - 若已在摘要頁：維持原本 `renderAll()`。
- **不要回退成**：直接改 `state.currentPage` + `renderAll()`。那就是這個 bug 本身。

#### 修正 2：歷年零件落點數字不準（資料正確性）

- **位置**：`app.js` → `modelDrillContent(modelName, focusMonth)` 與 `modelMetrics(modelName)`
- **原因**：`analyzer.js` 的 `modelHistory()` 對每個月只回傳 `topParts: aggregateParts(recs).slice(0, 5)`（每月前 5 名）。原寫法把「每月 top-5」相加當成「累計零件落點」，造成兩個問題：(a) 在每個月都排第 6 名以後的零件會從累計清單完全消失；(b) 某零件只在部分月份進前 5，累計數字會偏低。實測 MSM0801：舊算法 7 種零件、正確為 9 種。對「輸入型號查歷年故障落點」這條主流程來說是給錯資料。
- **修改方式**：改用完整記錄直接聚合，不經過每月截斷：
  - 累計檢視（`__all__`）：`RepairAnalyzer.aggregateParts(modelRecords)`
  - 單月檢視：`RepairAnalyzer.aggregateParts(modelRecords.filter(r => r._monthKey === curMonth))`
  - `modelMetrics` 的 `topParts` 同樣改為 `aggregateParts(recs)`。
  - `aggregateParts` 已在 `window.RepairAnalyzer` 匯出，可直接使用。
- **注意**：`modelHistory()` 本身沒改（月卡片仍用它），只是不再拿它的截斷結果做累計。

#### 修正 3：模糊比對未正規化（搜尋容錯）

- **位置**：`app.js` → `resolveModelQuery(raw)`
- **原因**：exact 比對有把兩邊都過 `normalizeModel`，但 fuzzy 比對寫成 `m.includes(norm) || norm.includes(m)` — `m` 是原始型號字串、`norm` 是正規化後（大寫、去 `-_空格`）的輸入。只要輸入帶連字號、空格或小寫（`msm-0801`、`zspmg 51`），fuzzy 就永遠比不中。
- **修改方式**：fuzzy 比對兩邊都先過 `normFn`（`normalizeModel`，含 fallback），並加 `norm.length >= 3` 門檻，避免打一兩個字就誤中不相干型號。實測 `msm-0801`→`MSM0801`、`zspmg 51`→`ZSPMG51`、`iot0600`→`IOT0600` 均命中。

#### 驗證方式（本次實際跑過）

```bash
node --check app.js && node --check analyzer.js
node build.js
## 以 node 直接載入 analyzer.js + data.json，驗證：
##   1) resolveModelQuery 對 msm-0801 / zspmg 51 / iot0600 命中
##   2) MSM0801 累計零件 舊法 7 種 vs aggregateParts 9 種，top1 數字一致
```

已知但未動的項目（留給下一位 AI 判斷）：
- `modelDrillContent` 的「故障原因落點」永遠用全月份記錄，即使 drawer 聚焦單月 — 型號查詢主流程用 `__all__` 所以不影響，但 drawer 單月檢視時語意稍有不一致。
- `sw.js` activate 時 `client.navigate()` 會強制重載所有分頁 — 這是刻意換新版的設計，但使用者若正在輸入會被打斷，屬已接受的取捨。
- `quickModelSearchInput` 自動搜尋會把月份選擇重設為全部 — 符合「歷年落點」目標，屬刻意行為。

### 優化紀錄（2026-07-23，版本 20260723-1）

針對 7 月資料匯入後的全面盤點，10 項全部完成。下一個 AI 請勿回退這些設計：

#### 資料正確性
1. **型號別名解析層**（`analyzer.js` → `buildModelAliases` / `canonicalModel`）。來源 Excel 對同一產品有多種寫法，造成歷年落點被拆散、分母對不上。用三段式資料驅動推導：版本尾碼→基礎型號、分頁名↔主要 model 綁定、易混淆字元折疊+編輯距離≤1（限唯一候選）。**不要改成寫死對照表**。實測合併 4 組（THS0010←THSM010/THS001A、ZWDI020←ZWDIO20/ZWDUO20/ZWIO20、ZBPIR50←V2.0/V2.0.2、SCL0200←SCL0020），分母失效 8→0，有故障率的機種 5→7。
   - 注意：分頁名必須通過 `MODEL_CODE_RE`（純英數且含數字）才納入綁定，否則「立O保全」「主機」這類大類分頁會被誤綁成單一型號。
   - 版本家族的代表寫法固定用「基礎型號」（ZBPIR50，不是筆數較多的 ZBPIR50V2.0）。
2. **版本變體合併**：ZBPIR50 家族從 5 筆變 31 筆。記錄保留 `modelVariantKey` 供 UI 顯示合併前寫法。
3. **選填欄位無資料時顯示「來源未填」**（`app.js` → `fieldHasData` / `optionalMetric`）。保固/技師/工時等 v2 模板欄位在所有來源報表都是空的，原本指標永遠顯示 0 會誤導。

#### 效能
4. **條件式請求**：`app.js` 與 `sw.js` 的 `cache` 從 `'no-store'` 改 `'no-cache'`，帶 If-None-Match，內容沒變時回 304 不重傳 body。**不要改回 `no-store`**，那等於每次開啟全量下載 2.6MB。
5. **記錄瘦身**（`parser.js` → `compactRecord`）：省略空值選填欄位，data.json 4.06MB→2.61MB（-36%），分析結果完全一致。讀取端一律 `r.x || ''` / `!= null`，undefined 與空字串等價。
6. **查詢快取**（`analyzer.js` → `cached` / `filterKey`）：以 db 物件為 key 的 WeakMap，db 一換自動失效。getRecords / getDenominators / detectAnomalies 皆已包裹。實測 40 次 getRecords 750ms→4ms。**前提是回傳值不可就地修改**（已全檔掃描確認無 sort/push/splice）。

#### 判讀正確性
7-8. **型號補充抽屜警語**（`app.js` → `suppCaveats`）：無維修記錄時明說「不是資料遺漏」；有維修記錄時明說兩種故障率分母不同不可比大小。故障率 KPI 加註「此口徑≠維修故障率」。
9. **序號語意：機器序號 vs 生產序號**（`parser.js` → `serialKind`；`analyzer.js` → `isMachineSerial` / `batchSerialModels`）。

   **維修課已確認**：部分分頁的序號欄是「生產序號」＝製令批次號，同一批多台機器共用同一個號碼。重複出現代表**同一批次**，不是同一台機器重複維修，**不應列為異常，只列為警示**。

   根因：`findCol` 用 `includes` 比對，`'生產序號'.includes('序號')` 為真，於是被當成機器序號。實測 7 月來源檔：
   - `IOT0600` / `ZSPMG51` / `ZSPMG31` 分頁用「生產序號」→ `serialKind='production'`
   - 其餘分頁用「機器序號」→ `serialKind='machine'`

   修正內容：
   - `parser.js` 明確判斷欄名並寫入 `record.serialKind`，同時保留 `prodSerial`。**不要只靠 `findCol` 的 includes 判斷序號語意**。
   - 重複維修（單月 `repeatedSerials`、跨月 `crossMonthSerials`、KPI `repeatedSerials`）一律只採計 `serialKind==='machine'`。
   - 舊資料已依 7 月來源檔的分頁欄名回填 `serialKind`（同一份月報模板每月一致）；7 月沒有的分頁用統計推定（重複倍數 <3 者判為 machine，實測 14 個分頁全為 1.0x）。
   - 原本的「序號欄疑似填成批號」異常改為 **info 層級說明性警示**「這些機種用製令批次號」，並指向製造批次頁。

   效果：7 月異常 46→36、critical 30→**9**（剩下全是真實問題）、跨月重複 99→9、重複維修 KPI 164→**50**。

   **不要**把 production 序號放回重複維修分析，也不要把這則警示升級成 critical。

9b. **製令落點分析**（`analyzer.js` → `orderLotAnalysis`；`app.js` → `renderOrderLots`；`index.html` → `#orderLotPanel`）。這是製令號重複時**真正該用的分析**：依製令批次彙總，看哪一批故障集中、集中在哪個零件。實測 7 月 129 個製令，最集中的 `ZSPMG31 製令190218053` 82 件、83% 集中在 `ORD324`。位置在「製造批次」頁最上方。
10. **小樣本/單月警語**：整新測試數 <100 台或只有單月資料時，抽屜顯示明確警語（ZBIRC5S 僅 74 台、12 個無線機種都只有單月）。

### 第二輪優化（2026-07-23，版本 20260723-3~5）

#### 異常警示流光（依使用者指定行為）
- **粉紅底 + 流光只出現在「本次登入尚未讀過」的 critical 警示**（`app.js` → `alertKey`/`isAlertUnseen`/`markAlertSeen`/`resetSeenAlerts`；CSS class `.alert-unseen`）。
- 點開警示 → `markAlertSeen()` 立刻移除 class（不等重新渲染）並記入 `sessionStorage['titan_alert_seen_v1']`。
- `doLogin()` 成功時呼叫 `App.resetSeenAlerts()` → 重新登入全部再亮。**注意 `doLogin` 在 Auth IIFE、`resetSeenAlerts` 在 App IIFE，必須透過 `App.` 呼叫**。
- key 用 `type|subject`，總覽列與異常頁共用已讀狀態。
- 流光 3 秒一輪（0.6s 掃、2.4s 停），`pointer-events:none` 不擋點擊，`prefers-reduced-motion` 時只留粉紅底。
- 莫蘭迪版在 `styles-morandi.css`（主題是靠注入樣式表切換，**不是 `data-theme` 屬性**，別用 `html[data-theme=...]` 選擇器）。

#### 非料件字串分離（使用者確認：不算備料、保留在故障分析）
- `analyzer.js` → `isWorkNote` / `workNotePareto`；`partPareto(records, {db})` 預設排除。
- **雙重把關**（使用者指定）：含動作關鍵字（取消/破損/重燒/氧化…）**且**在 `partsMaster` 8,996 筆主檔找不到，才判為作業記錄。真料件品名帶「不良」字樣但主檔有登錄就不會誤判。
- 實測分出 10 項 2,060 件（占 24%），最大宗「取消C15、C41、E1」1,746 件（寫在故障零件二欄）。修正前備料建議會算出「建議備料 699 個取消C15」。
- 排除後會 `recomputeShares()` 重算佔比與累計，否則百分比加不到 100%。
- UI：零件 Pareto 頁下方 `#workNotePanel`（`renderWorkNotes`），明示「不計入備料建議」但保留查詢。
- **所有 `partPareto` 呼叫點都要傳 `{db}`**，否則排除不會生效。

#### 月趨勢「只看每月都有的機種」（使用者指定：預設開）
- `analyzer.js` → `commonModels(db, filter)`、`monthlyTrend(db, filter, {commonOnly})`。
- 原因：各月涵蓋差異大（3月39種、5月24種、7月55種），件數上升有一部分只是納入更多機種。共同機種目前 11 種。
- **只看共同機種時分母也要同步只算這些機種**，否則故障率被低估。
- 預設開（`state.trendCommonOnly`，存 `localStorage['titan_trend_common_only']`），開關在月趨勢頁 `#trendCommonOnly`，並在各月機種數落差 ≥1.5 倍時顯示 `#trendCoverageNotice` 說明。

#### 使用者未採納 / 待確認
- `TS-1185-025C`（1,087 件）與 `TS-1185-025`（538 件）只差 C 尾碼、同為 TAC SW 按鍵開關，**使用者表示不確定，暫不合併**。若日後確認同料，加入 `parser.js` 的 `normalizeKnownPartAlias`。

### 2026-08-16 AI-readme 更新（Manus 多倉庫優化迭代）

#### 現況

本次迭代前：線上版部署 index.html＋五支 JS（parser/analyzer/app/report/rma）＋sw.js，版本快取靠手動同步三處錨點（JS `?v=`、sw.js `CACHE_NAME`、data.json `publishedAt`）；離線單檔 `TITAN-STAR.html` 由 `build.js` 產出。**沒有任何 CI/測試自動化**——每月 Excel 匯入、改碼、升版全部人工，手動升版漏改任一個錨點就可能讓使用者手機看到舊版 data.json。工程分數 87（滿分組最弱之一）。

#### 修改方向（2026-08-16 迭代，經多輪辯證後收斂）

- **拆 app.js？否。** 辯證結論：app.js（369KB）是 UI 主體且與版式深度耦合，CI 無法驗證 UI 行為，強行拆風險>收益，留給下一輪（下一輪需配合 UI 回歸測試框架）。
- **版本管理自動化：是。** 新增 `scripts/build-version.mjs` 單一命令升版，一次更新 index.html 全部 `?v=` 與 sw.js `CACHE_NAME`，data.json 只讀不寫；並用 `scripts/check-version-anchors.mjs` 驗證錨點一致。
- **補資料層測試：是。** `tests/data-integrity.test.mjs`（9 項）：data.json 結構斷言（月份/8,996 筆 partsMaster/13 機種 modelSupplements）、parser/analyzer 用 vm 模擬掛載 smoke 測試、normalizePart 同義詞合併斷言、每月筆數合理性。
- **CI：是。** `.github/workflows/site-check.yml`：語法檢查五支 JS、`node --test`、錨點一致性、離線單檔 build 檢查。

#### 修改進度（2026-08-16 已完成並驗證）

| 項目 | 狀態 | 驗證 |
|---|---|---|
| `scripts/build-version.mjs` | 已建立 | dry-run：升版 20260816-1 成功、錨點一致、data.json md5 未變、checkout 可完全復原 |
| `scripts/check-version-anchors.mjs` | 已建立 | 現狀 20260724-2 一致；模擬不一致可正確報錯 |
| `tests/data-integrity.test.mjs` | 9 項全綠 | node --test 9 pass / 0 fail |
| `.github/workflows/site-check.yml` | 已建立 | node --check 五支 JS OK、build.js 產出 822KB 單檔 OK |

#### 後續接手注意事項

1. **每次改版（含每月匯入新月份）必須跑 `node scripts/build-version.mjs <YYYYMMDD-N>`**，不要手動改 ?v= 或 CACHE_NAME；升版後同步更新本段版本歷史再 commit。
2. **每月匯入新月份後必跑 `node --test tests/`**——測試已內建「每月筆數 < 5,000」合理性斷言，匯入腳本壞掉或資料欄位偏移會被抓到；若測試擋住合法變更，先改測試再改資料。
3. **app.js 模組化留給下一輪**，但下一輪開始前必須先建立 UI 回歸測試（建議 Playwright 針對型號查詢/異常卡/手機 390×844 三條核心路徑截圖比對），沒有回歸網不拆。
4. `TITAN-STAR.html` 離線單檔存在 repo 內供離線使用，build.js 產出後若內容變更需一併 commit；CI 會直接阻擋不同步的提交。
5. parser/analyzer 的解析輔助函式（normalizePart 等）在 IIFE 內部 scope 不掛 window，測試用 vm 只能測公開介面——日後若想測內部函式，需在 parser.js 加測試用掛鉤（僅限開發環境）。
6. data.json 2.6MB 每月成長，tests 裡 partsMaster/modelSupplements 數量下限（8,000 / 12）會隨新匯入自動通過；但若某天**筆數異常下降**（匯入腳本清掉舊月份）測試也會擋，屆時確認是預期行為再調下限。
