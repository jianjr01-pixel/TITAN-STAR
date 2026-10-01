# TITAN-STAR AI 交接 README

> 2026-09-30：版本歷史已移至 [CHANGELOG.md](./CHANGELOG.md)。登入已改為 Cloudflare Worker（見 `worker/README.md`），下方「公開曝光現況」已更新。
>
> 2026-09-07：更新機制已改為「每次開啟檢查 date」，取代舊版每月 1 號的描述，請以「每月資料更新」章節為準。

新增 monthly-source.js（來源／版本／整批驗證）、privacy.js（共用遮罩）、scripts/check-source-dir.cjs（CI 唯讀檢查）。首頁預設最新月、歷史範圍按日曆計算、前月缺資料不做月增減。sourceImport 保存在 repair_db_v2；更新失敗不覆蓋，儲存失敗仍使用 session 內已驗證資料。新來源不依賴 data.json 每月重新發佈。

> ⚠️ 存檔請務必用 **UTF-8（不要 BOM）**。曾發生某 AI 在 Big5/Windows 環境存檔，把本文件 2/3 中文變亂碼（`20260722-4` 版本時修復）。編輯後可用 `python3 -c "open('AI-HANDOFF.md',encoding='utf-8').read()"` 確認不報錯。

這份文件是給 Claude、Codex 或其他 AI 工程代理閱讀的交接文件。目標是讓下一個 AI 能快速知道目前做到哪裡、使用者真正想要什麼、哪些地方不要再走回頭路。

## 一句話目標

TITAN-STAR 是電子工廠維修資料分析網站。現在最重要的主流程是：

```text
登入 → 輸入型號 → 只看該型號的維修紀錄、故障原因、故障內容、零件落點
```

使用者會自己判斷趨勢，再到網站輸入型號查落點。因此不要把「全廠異常偵測」當作型號查詢的主要結果。

## 目前公開狀態

- 線上網站：https://jianjr01-pixel.github.io/TITAN-STAR/
- GitHub repo：https://github.com/jianjr01-pixel/TITAN-STAR
- 2026-10-01 起正式倉庫搬到 `jianjr01-pixel/TITAN-STAR`（原 `Campcool/TITAN-STAR` 不再更新）。
- 最新版本：`20261001-1`（尚未部署：需先完成 Cloudflare Worker 設定，見 `worker/README.md`）
- 最新變更：登入改由 Cloudflare Worker 驗證、公開 data.json 移除帳號、SPC 改為 p-chart
- 版本歷史：見 [CHANGELOG.md](./CHANGELOG.md)（新到舊）。
- 目前 `data.json` 內容：
  - 月份：`2026-03`、`2026-04`、`2026-05`、`2026-06`、`2026-07`
  - 維修紀錄：`6,587` 筆（檔案 2.61MB，已移除全空選填欄位）
  - 料件主檔 `partsMaster`：`8,996` 筆（品號/品名/規格/大類代碼）
  - 型號補充 `modelSupplements`：目前 `13` 個機種（ZBRT050 為單機種完整版；ZBDIO90/ZSPMG51/ZSPMG31/ZSPMB31/ZSPMB51/ZBIRC50/ZBIRC5S/ZBSPC40/ZBPIR50/ZBPIR5P/ZBHD060/ZBSD060 為無線一覽表 2026-07 快照）
  - `publishedAt`：`2026-07-22T01:28:28.854Z`

## 公開曝光現況（2026-08-17 盤點，**未完全解決**）

這一節記錄本專案在公開網路上的真實暴露程度。不是待辦，是現況說明——
之後任何人要評估「這樣放著行不行」，先讀完這節再判斷。

### 事實

- `data.json`（2.9 MB）**無需登入即可下載**：
  `https://jianjr01-pixel.github.io/TITAN-STAR/data.json` → HTTP 200。
  內含 6,587 筆維修紀錄（機種、生產序號、故障原因、故障內容）與
  8,996 筆料件主檔。同一份檔案在公開 repo 內也可經 raw.githubusercontent 取得。
- **資料含客戶／協力廠商名稱**：`中O防災科技`、`中O科技`、`立O電子`、
  `多O凱拔電子`、`立O保全`（`立O保全` 另出現在 `analyzer.js`、
  `TITAN-STAR.html`、本檔）。搭配 `category`（無線保全／傳統保全／車機系統／
  監視器）與各機種故障率，可辨識產業鏈位置。
- **登入（2026-09-30 起）**：帳號密碼由 Cloudflare Worker + D1 驗證（`worker/`），
  網頁不再保存任何帳號資料。舊版 `doLogin()` 不檢查密碼、`ADMIN_ID` 寫死的問題已隨舊
  `window.Auth` 一併移除。**但登入仍只控制畫面**：`data.json` 與 `date/` 的 Excel 是公開
  網址，跳過畫面直接抓取仍可取得，這點與 2026-08-17 相同。

### 已做（止血，2026-08-17）

三個 HTML 加上 `noindex,nofollow`，讓工具頁不會出現在搜尋結果。
這處理掉最現實的曝光途徑——沒有人會去猜這個網址，但搜尋引擎會自己找到。
新增 `internal tool pages carry noindex` 斷言防止回歸。

**刻意不用 robots.txt**：(1) 專案頁的 robots.txt 必須位於網域根目錄
`jianjr01-pixel.github.io/robots.txt`，需要另建 `jianjr01-pixel.github.io` repo；
(2) 對「已收錄、想移除」的情境，擋掉爬取會讓 Google 看不到 noindex，
網址反而可能以「僅網址」形式留在索引。正解是只加 noindex、不擋爬取。

### 未解決

`noindex` 只擋搜尋引擎，**擋不住知道網址的人**。而且 `data.json` 無法加
meta 標籤，GitHub Pages 也不允許設定 `X-Robots-Tag` 標頭，所以它本身
仍可被抓取。repo 為公開，檔案也留在 git 歷史裡。

要真正擋住需要換架構，成本由低到高：
1. **Cloudflare Pages + Access**（建議）：一層真正的登入牆擋在檔案前，
   驗證未過連 `data.json` 都送不出來。免費方案即有，設定約半小時。
   本專案群已在用 Cloudflare Workers（灰汰郎表單），帳號現成。
2. repo 轉私有：免費方案下 GitHub Pages 會一併停用，網站等於關閉。
3. 從 git 歷史徹底移除 `data.json`：需重寫歷史，不可逆。

### 業主決定（2026-08-17）：維持現狀

以下三項都已完整說明過風險，業主（＝本工具的唯一使用者，同時是工廠端）
評估後決定**維持現狀，不再處理**：

| 項目 | 現況 | 決定 |
|---|---|---|
| `data.json` 公開可下載 | 無需登入，2.9 MB | 接受。理由：自用的維修分析報表，機敏度不高 |
| `users` 內 15 組帳號、14 組密碼雜湊 | 隨 `data.json` 公開 | **2026-09-30 使用者改變決定：已移除**。帳號改存 Worker D1，跨裝置不再依賴 data.json。所有密碼需在 Worker 重設 |
| git 歷史含未遮罩舊版 | 舊 commit 可取得客戶原名、全名、雜湊 | 接受，不重寫歷史 |

**給後續 AI 代理：其餘兩項（data.json 公開、git 歷史）仍是明示取捨，不要再提報，也不要自行「修正」。**
它們是有意的決定，不是疏漏。git 歷史中仍可取得舊雜湊，因此舊密碼一律視為已外洩。要動任何一項都必須先問業主。

已完成的部分（`noindex`、客戶名稱遮罩、姓名只留姓氏、匯入流程自動遮罩）
則屬於防回歸範圍，**不可回退**——CI 的 `mask-identifiers.cjs --check` 與
`internal tool pages carry noindex` 測試會擋。

**唯一需要重新評估的觸發條件**：資料範圍擴大到目前以外的類型，
例如加入客戶聯絡人、報價、良率、成本或任何個人資料。屆時上述取捨的
前提（「只是自用的維修分析報表」）就不再成立，必須重新和業主確認。

## 使用者偏好與重要決策

- 使用者不希望每次登入後還要手動上傳資料。
- 2026-09-07 使用者更新決策：每次開啟網頁都檢查 jianjr01-pixel/TITAN-STAR/date，新增／更正版立即讀取；取消每月 1 號限制。
- 型號查詢是最重要入口，必須放在最上面，PC 與手機都一樣。
- 型號查詢結果要「只針對這個型號」，不要混入其他設備、其他零件或全廠異常卡。
- 目前已改成型號查詢結果直接顯示在頁面下方，不再依賴彈跳視窗。
- 型號查詢的零件落點要優先使用 Excel 首頁 `故障零件總數` 的 `整新數` 當分母，顯示 `數量 / 整新數 / 故障百分比`。
- 零件名稱必須先做同義詞/語序正規化再聚合，例如 `8瓦喇叭`、`喇叭8瓦`、`8W 喇叭` 要合併；目前高信心別名包含 `ORD324 / REED SW 磁簧管 / 磁簧管`、`主板 / 主機板`、`SIM座 / SIM卡座`、`尾線網口組 / 網口線組`。
- 角色觀點切換必須有明確文字，例如 `角色觀點：綜合`，不能只顯示 `綜合`。
- 型號查詢要固定放在最上方 top bar，和角色觀點並列成兩個獨立控制板；不要再放回篩選 subbar，以免使用者以為它只是篩選條件。
- `Iansui`（芫荽）字體只用在標題、提示、分區標籤等友善閱讀位置；表格、數字、型號、料號仍使用清楚的 Noto Sans TC / JetBrains Mono，避免報表可讀性下降。
- UI 必須讓非工程人員、小學生也能大致看懂。避免功能名太抽象，避免使用者需要猜按鈕用途。
- 手機 RWD 很重要。PC 可放長文字，但中尺寸與手機要收斂，不能把畫面撐爆。
- **字級採固定 px、不做使用者可調**。使用者先前已要求移除右上角「大中小」控制項（理由：功能失效，改用手機捏合縮放即可），後續確認維持「固定格式優化可讀性」而非改成 rem。因此**字要多大由我們決定，最小字級必須自己顧好**。
- 異常警示的粉紅流光只標記「本次登入尚未讀過」的項目，不是單純標記嚴重度。

## 現有文件分工

- `README.md`：專案入口、部署網址、每月資料更新方式。
- `DESIGN.md`：系統設計、資料模型、分析引擎與領域知識。適合 AI 深入理解架構。
- `SOP.md`：一般使用者與主管角色操作流程。
- `monthly-reports/README.md`：每月 Excel 檔案放置規則。
- `AI-REVIEW-PROMPT.md`：可貼給其他 AI 做完整專案分析的提示詞。
- `AI-HANDOFF.md`：本文件，記錄 AI 與 AI 之間的工作交接與當前進度。
- `CHANGELOG.md`：版本歷史與各輪優化紀錄。
- `worker/README.md`：登入服務部署與安全設計。
- `archive/`：已停用、不再發佈的舊檔（例如莫蘭迪舊版單檔）。

## 主要檔案職責

| 檔案 | 職責 |
| --- | --- |
| `index.html` | SPA DOM 骨架、上方列、篩選區、頁面容器。 |
| `styles.css` | 主樣式、RWD、卡片層次、型號查詢列、角色選單。 |
| `styles-morandi.css` | 莫蘭迪主題覆蓋。**主題是靠注入/移除這個樣式表切換，不是 `data-theme` 屬性**，別用 `html[data-theme=...]` 選擇器。 |
| `rma-styles.css` | RMA 模組樣式。**載入順序在 `styles.css` 之後**，此檔中未加 media 限制的規則會蓋掉 `styles.css` 的 `@media` 規則（曾造成手機版破版，見「RWD 與可讀性」段）。 |
| `parser.js` | Excel 解析與維修資料標準化。 |
| `analyzer.js` | 純分析函式，避免在這裡碰 DOM。 |
| `app.js` | 主應用狀態、登入後流程、雲端同步、頁面渲染、型號查詢；`window.TitanUI`（快捷鍵、通知、延遲載入圖表）。 |
| `auth-config.js` | Cloudflare Worker 網址。未填時登入按鈕停用、部署被 CI 擋下。 |
| `auth-worker.js` | 登入、改密碼、後台畫面（`window.Auth`）。權限判斷全在 Worker。 |
| `worker/` | Cloudflare Worker + D1 登入服務，不發佈到 Pages。部署步驟見 `worker/README.md`。 |
| `report.js` | 報告產出。 |
| `rma.js` | RMA 管理模組，目前不是主流程。 |
| `data.json` | GitHub Pages 讀取的雲端資料快照。除 `months` 外還含 `partsMaster`（料件主檔陣列）。**不得含帳號或雜湊**。 |
| `build.js` | 產生離線單檔 `TITAN-STAR.html`。 |
| `sw.js` | service worker 快取。修改 JS/CSS/HTML 後必須升版。 |

## 目前型號查詢相關位置

- `index.html`
  - `#modelQuickSearch`
  - 目前放在 `#subbar` 最上方的 `.top-model-lookup`
- `app.js`
  - `quickModelSearchInput(raw)`
  - `quickModelSearch(raw, opts)`
  - `renderModelSummary(modelName, records, kpis)`
  - `modelDrillContent(modelName, focusMonth)`
  - `openModelDrawer(model, focusMonth)` 保留給下鑽，但不是主要型號查詢結果。
- `styles.css`
  - `.top-model-lookup`
  - `.model-lookup-input`
  - `.model-result-pill`
  - `.model-fault-grid`
  - `.model-record-list`

重要：使用者曾反應彈跳視窗不穩、X 不好關，所以不要再把型號查詢主流程改回「必須開彈窗」。

## 料件資料庫（Parts Master DB）

**目的**：使用者是電子廠，維修記錄裡的零件多半是純料號/規格（如 `AI-10H3C`、`ORD324`），非工程人員看不懂。料件資料庫把品號主檔帶進來，讓全站報表能顯示白話名稱與群組類別（電容/電阻/IC/開關…），達成「外行人也看得懂是什麼零件」。

**資料來源**：使用者上傳的「品號基本資料報表」Excel（8,996 筆），已解析進 `data.json` 的 `partsMaster` 欄位，格式為陣列 `[品號, 品名, 規格, 大類代碼]`。大類代碼對應 `parser.js` 的 `PART_CATEGORY`（如 `105`→電容、`217`→SMD連接器）。

**分頁位置**：側欄最下方 `料件資料庫`（`data-page="partsdb"`），對應 `#pagePartsdb` 與編輯用 `#pdbModal`。

**app.js 相關函式（都在「料件資料庫」註解區塊內）**：

- `pdbRows()`：合併主檔 + 本機編輯後的完整清單（有快取 `pdbCache`）。
- `pdbInfoOf(partText)` / `pdbGroupOf(partText)`：把維修記錄的零件文字模糊比對回主檔，回傳 `{name, group}` 或群組名。比對順序：規格精確 → 品名精確 → 規格包含。
- `pdbLabel(partText)`：**報表顯示核心**。純規格/料號會換成「品名（原文規格）」，例如 `AI-10H3C` → `蜂鳴器（AI-10H3C）`；比對不到就原文顯示。全站零件顯示（總覽最常更換零件、機種排名展開、零件 Pareto、跨機種矩陣列標題、明細頁零件欄、型號 drawer、零件下鑽 drawer 標題）都走這個函式。
- `pdbTag(partText)`：回傳群組小標籤 HTML（如 `電容`），掛在零件名旁。
- `renderPartsdb()` / `pdbSearchRender()`：分頁渲染與搜尋/群組篩選。
- `pdbOpenEdit / pdbSaveEdit / pdbDelete`：新增/編輯/刪除，寫入 `localStorage`。
- `pdbMergedMaster()`：發布時把合併後主檔塞回 `data.json` payload（見 `publishData` 的 `partsMaster:` 欄位）。
- `report.js` 生成報告的零件表也用 `window.PartsDB.infoOf/groupOf` 顯示「品名（規格）」與「類別」欄。

**儲存與同步機制**：

- 主檔存 `localStorage['titan_partsmaster_v1']`；`syncCloud()` 會在雲端有 `partsMaster` 或本機缺主檔時自動補寫。
- 使用者的新增/編輯/刪除存 `localStorage['titan_partsmaster_edits_v1']`，結構 `{add:[], mod:{品號:[品名,規格,大類]}, del:[品號]}`，與主檔分離，避免覆蓋原始資料。
- 管理員「發布」→ `pdbMergedMaster()` 把主檔+編輯合併寫入 `data.json` → 推 GitHub → 全員同步。

**注意**：Codex 後續在 `parser.js` 加了「零件同義詞/語序正規化」（`8瓦喇叭`=`喇叭8瓦`），那是**維修記錄零件名的聚合正規化**，與這裡的**料件主檔對照**是兩套獨立機制，改動其一時不要誤動另一個。

## 型號補充摘要（modelSupplements）

**目的**：部分機種除了月度維修報表外，還有獨立的「整新測試 / 年度故障分佈」Excel。此功能把這類補充資料帶進型號查詢抽屜，讓落點分析更完整。目前已匯入 13 個機種（ZBRT050 為完整版，另 12 個無線機種為 2026-07 快照）。

**資料位置**：`data.json` 的 `modelSupplements` 欄位，key 為機種名。單筆結構：`{sourceType, model, modelDisplay, sourceFiles, monthly, reasons, annual, updatedAt}`。

**兩種來源格式 / 兩支匯入腳本**：
- **單機種完整版**（如 ZBRT050，含多月歷史 + 年度分佈）：`scripts/import-model-supplement.js`，指令 `npm run import:supplement -- "<file.xlsx>"`。此腳本解析 Excel 需要 Python；Codex 環境用 `--python "C:\\Users\\031780\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe"` 指定直譯器。sourceType = `model-supplement-v1`。
- **無線多機種一覽表**（機種為欄、整新測試數/可用率/故障比例/分類故障明細為列的矩陣）：`scripts/import-wireless-overview.js`，指令 `npm run import:wireless -- "<file.xlsx>" [--month YYYY-MM]`。純 Node（用專案內 xlsx，不需 Python）。sourceType = `wireless-overview-v1`。同基礎型號的多個版本（如 `ZSPMG51(1.0.9)/(2.0.2)/(2.0.3)`）會合併成一個 `ZSPMG51` entry，各版本為不同 `variant`，analyzer 讀取時自動加總。**此腳本會保護既有 `model-supplement-v1` 資料不被覆蓋**（例如 ZBRT050 已有完整版就跳過）。

**重要語意**：
- 「整新測試數 / 整新測試故障」與「年度故障分佈總數」是**不同基準**，UI 已拆成不同色卡，不要混算故障率。
- 年度分佈的 7,217 是**歷史年度數**，不是本期整新測試故障；不要拿去除整新測試數當百分比。

**注意**：這是「單機種補充摘要」，與主流程的月度維修記錄（`months`）、料件主檔（`partsMaster`）都是獨立資料源，改動時不要互相污染。

## 每月資料更新（2026-09-07 起）

1. 到 [jianjr01-pixel/TITAN-STAR 的 date 資料夾](https://github.com/jianjr01-pixel/TITAN-STAR/tree/main/date)，上傳當月維修報表與整新故障 Excel 並 Commit changes。
2. 開啟 https://jianjr01-pixel.github.io/TITAN-STAR/ 。每次開啟都檢查新增／更正版；已開啟時按「檢查更新」。
3. 確認分析期間與更新狀態；不需要執行程式、改日期、重新部署或等待每月 1 號。

完整檔名規則與排錯步驟見 [接手者操作說明](https://github.com/jianjr01-pixel/TITAN-STAR/blob/main/date/README.md)。
最新月份取報表月份最大值；同月更正版取代原月份，保留歷史。整批解析、資料驗證與檔案 SHA 比對通過後才套用。
沒有變更只讀資料夾清單，不重抓 Excel。連線／格式／版本衝突時保留本機上一版，首次使用則保留隨站歷史快照並明示失敗。

自 20260907-7 起，`115年 08 月維修報表.xlsx` 與 `115年8月整新故障.xlsx` 兩種格式都由 date 自動匯入。前者更新 RMA 月報、主月報內的正常整新分母與零件資料；後者更新無線機種的整新測試、整新故障、可用率與原因碼補充。品號主檔、年度或其他機種補充表仍沿用獨立資料源。

## 修改後必做檢查

一般前端/文件以外的程式修改後至少跑（與 CI 相同）：

```bash
node scripts/check-syntax.mjs
node --test tests/*.test.mjs
node scripts/mask-identifiers.cjs --check
node scripts/check-version-anchors.mjs
node scripts/check-auth-config.mjs
node build.js && git diff --exit-code TITAN-STAR.html
git diff --check
```

升版後在 `CHANGELOG.md` 最上方補一筆版本說明。

如果只改 Markdown，可不用 `node build.js`，但提交前仍建議確認 `git status --short`。

## 快取與部署注意事項

GitHub Pages 與手機瀏覽器很容易吃舊版。只要修改 `index.html`、`app.js`、`styles.css`、`parser.js`、`analyzer.js`、`report.js`、`rma.js`、`auth-config.js`、`auth-worker.js` 或 `sw.js`，請同步升版（用 `node scripts/build-version.mjs <YYYYMMDD-N>`，不要手改）：

- `index.html` 裡所有 `?v=YYYYMMDD-N`
- `sw.js` 的 `CACHE_NAME`

範例：

```text
20260716-5 → 20260717-1
titan-star-v20260716-5 → titan-star-v20260717-1
```

部署流程：

```bash
git add <changed files>
git commit -m "<message>"
git pull --rebase origin main
git push origin main
```

推送後確認 GitHub Pages：

```bash
curl.exe --ssl-no-revoke -s -o gh-run.json "https://api.github.com/repos/jianjr01-pixel/TITAN-STAR/actions/runs?branch=main&per_page=1"
node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('gh-run.json','utf8')); const r=j.workflow_runs&&j.workflow_runs[0]; console.log(r?JSON.stringify({status:r.status,conclusion:r.conclusion,head_sha:r.head_sha,updated_at:r.updated_at},null,2):'no runs');"
```

公開站確認時用 cache busting：

```bash
curl.exe --ssl-no-revoke -L -s -o public-index.html "https://jianjr01-pixel.github.io/TITAN-STAR/?bust=<commit>"
curl.exe --ssl-no-revoke -L -s -o public-app.js "https://jianjr01-pixel.github.io/TITAN-STAR/app.js?bust=<commit>"
curl.exe --ssl-no-revoke -L -s -o public-styles.css "https://jianjr01-pixel.github.io/TITAN-STAR/styles.css?bust=<commit>"
curl.exe --ssl-no-revoke -L -s -o public-sw.js "https://jianjr01-pixel.github.io/TITAN-STAR/sw.js?bust=<commit>"
```

確認字串範例：

```bash
rg -n "20260716-5|top-model-lookup|角色觀點：" public-index.html public-app.js public-styles.css public-sw.js
```

最後刪除暫存：

```powershell
Remove-Item -LiteralPath gh-run.json, public-index.html, public-app.js, public-styles.css, public-sw.js, public-data.json -ErrorAction SilentlyContinue
```

## 已知坑

- 不要用全廠異常卡回答型號查詢。使用者會覺得「我輸入 RFTG030，為什麼還在講其他設備」。
- 不要讓型號查詢依賴彈跳視窗。先前彈窗有「按了沒反應」與「X 不好關」問題。
- 不要把 `零件 Pareto` 的「佔故障件數比例」誤當成「故障率」。故障率/故障百分比要用 `整新數` 當分母。
- 手機寬度曾有右側大量留白問題。改 CSS 時務必注意 `100vw`、`100dvw`、固定寬度與橫向 overflow。
- service worker 若未升版，使用者手機可能一直看到舊畫面。
- **改 RWD 不要只讀 CSS 判斷**：三個 CSS 檔交互覆蓋，`rma-styles.css` 無 media 的規則會蓋掉 `styles.css` 的 `@media`。請用 Playwright 實測（見「RWD 與可讀性」段）。
- **字級固定 px，系統/瀏覽器字級設定對本站無效**，所以最小字級要自己顧；目前手機下限 13.5px。
- `TITAN-STAR.html` 是 build 產物。改 JS/CSS 後若需要離線版同步，必須跑 `node build.js`。
- 工作區可能有使用者或其他 AI 的變更；不要 `git reset --hard`，不要回復不相關改動。

## RWD 與可讀性（版本 20260724-1 / -2）

### ⚠️ CSS 串接順序的坑（曾造成手機版破版）

`index.html` 的載入順序是 `styles.css` → `rma-styles.css` → `styles-morandi.css`。
**後面檔案中「沒有 media 限制」的規則，會蓋掉前面檔案 `@media` 內的規則**
（media query 不增加 specificity，同權重時看串接順序）。

實際發生過的問題：`rma-styles.css` 的 `.mode-tabs { display: flex }`（無 media）
壓過 `styles.css` 的 `@media (max-width:820px) { .mode-tabs { display: grid } }`，
導致「型號查詢」與「角色觀點」在手機被擠成兩欄，**型號輸入框只剩 62px 寬**，
placeholder 只看得到一個字。同時該檔還有一組遺留規則：先 `display:none` 隱藏
主切換列、再用 `display:flex !important` 補救，那個 `!important` 是連鎖元兇。

修正方式：移除遺留規則，並把手機版佈局補在 **`rma-styles.css` 的最末**
（最後載入才贏得過）。**改動 `.mode-tabs`、`.mode-bar` 等共用 class 前，
務必三個 CSS 檔一起看**。

### 字級策略（使用者已定案）

- 全站字級固定 `px`（409 處），**不用 rem**。實測瀏覽器字級從 16 調到 28px，
  body 始終 16px —— 即系統/瀏覽器字級設定對本站**完全無效**。
- 這是刻意取捨：版面永遠不會被使用者設定撐爆，代價是**最小字級必須自己顧好**。
- 右上角「大中小」控制項已於更早版本移除，目前**不存在**，也沒有計畫加回。
- 20260724-2 已把整體字級**逐階上調一級**（不是套倍率——倍率會把行高、間距、
  圖示比例一起拉走）：

  | 手機（≤820px） | 原 | 現 |
  | --- | --- | --- |
  | 小標籤 | 12.5px | 13.5px |
  | 輔助文字 | 13 / 13.5px | 14.5px |
  | 一般內文 | 14px | **15px** |
  | 次要標題 | 15px | 16px |
  | 說明區塊 | 16px | **17px** |
  | 可點元素 | 12～13px | **15px + 42px 高** |

  標題與大數字（20/30/36px）**維持不變**，否則手機卡片會被撐爆。
  表格只上調一階（欄寬吃緊）。桌機最小輔助文字 12/12.5/13 → 13.5/14px。
- 目前手機最小字級 **13.5px**（原 10px）；仍在 14px 以下的只剩純圖示字符
  （下拉箭頭 ▾ 等），那是符號不是文字，放大會破壞對齊。
- **若日後要再調大**：沿用「逐階上調」而非倍率，並跑下方的實機驗證。

### 其他已修正的手機問題

- 篩選列收合鈕原本重複顯示下方控制項已有的統計，佔掉一整行 →
  展開時只留「篩選」二字（`.sbs-detail` 由 CSS 控制，見 `updateSubbarSummary`）。
- 手機下拉選單在 480px 以下改為上下排列，完整顯示「115/08 · RMA 返維修課 32 台」
  與「全部大類 · RMA 返維修課 32 台」；另一數量明確標成「正常整新流程 N 台」。
  兩者是不同作業流程，不可只寫成模糊的「維修／整新」，也不可暗示能直接相除為故障率。
- `.nav-toggle` 是 `position:fixed` 左下角 54px 浮動鈕，會蓋住最後一張卡片 →
  `.content` 手機版加 `padding-bottom: 96px`。
- `.role-sel-focus` 在 ~1024px 會被硬切 → 1024px 以下改為隱藏。

### 實機驗證方式（改 CSS/RWD 後請照跑）

**不要只讀 CSS 判斷版面**，本專案三個 CSS 檔交互覆蓋，讀原始碼很容易誤判
（我第一次就判斷錯）。用真實瀏覽器量測：

```bash
npm install -D playwright          # 沙箱已預裝 chromium，勿執行 playwright install
python3 -m http.server 8099 &      # 用 http 而非 file://，SW 與 fetch 才正常
```

驗證腳本重點（可自行重寫，這些是踩過的雷）：

- `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`
- **攔截外部 CDN**（jsdelivr / fonts.googleapis），沙箱連不出去會卡住 `networkidle`；
  用 `waitUntil: 'domcontentloaded'` + 固定等待，不要用 `networkidle`
- 登入態：2026-09-30 起需要 Worker 發的 token。本機測試可攔截 `*/api/auth/me` 回傳
  `{user:{username:'test',role:'admin'}}`，並在 `sessionStorage['titan_worker_session']` 放入
  `{token:'x',expiresAt:<未來時間>}`，然後**重新 goto** 一次
- 截圖必須加 `animations: 'disabled'`，否則警示流光是 infinite 動畫會讓
  `page.screenshot()` 逾時
- 檢查項目：`document.documentElement.scrollWidth > innerWidth`（橫向溢出）、
  `e.scrollWidth > e.clientWidth + 2`（文字截斷）、`getComputedStyle(e).fontSize`（字級分佈）
- 驗證寬度：**360 / 390 / 412 / 480 / 600 / 768 / 820 / 1024 / 1280**
  （目前這九種全部無橫向溢出、無文字截斷）
- 模擬瀏覽器字級：CDP `Page.setFontSizes({ fontSizes: { standard, fixed } })`
- 驗證完**記得刪掉暫存腳本**，也不要把 `playwright` 提交進 `package.json`

## 設計令牌三層架構（版本 20260826-1）

依 `Campcool/AI-skill` → `uiux-design/references/nextlevelbuilder_ui-ux-pro-max-skill__design-system/`
的 token-architecture 規範建立。令牌全部定義在 `styles.css` 最上方的 `:root`。

### 三層各自的職責

| 層 | 內容 | 什麼時候改 |
|---|---|---|
| **primitive** | `--fs-*`（字級階梯）、`--space-*`（2px 網格）、`--radius-*` | 幾乎不改，是基礎值 |
| **semantic** | `--text-body`、`--text-caption`、`--space-card-pad`、`--radius-card`… | **整體調整字級／間距時改這裡** |
| **component** | `--kpi-value-size`、`--btn-font-size`、`--tbl-cell-size`… | 單一元件的例外 |

### 為什麼值得做

20260724-2 要「整體字級調大一級」時，是在 media query 裡逐條硬編約 30 條規則。
有了 semantic 層之後，同樣的需求只要改 `--text-body` 那一行指向的階梯。

### 遷移方式與驗證（重要：這是可重跑的流程）

**只做精確值對應，不做四捨五入** —— 例如 `13.5px` 就對 `--fs-13-5`，
不會被吸收進 `--fs-14`。因此遷移本身保證零視覺變化。

兩道獨立驗證，缺一不可：

1. **位置比對**（強）：把每個 `font-size` / `padding` / `margin` / `gap` /
   `border-radius` 宣告依出現順序與 `git show HEAD:<file>` 對齊，解析 token 後
   比對數值。結果：三檔共 **1,260 條宣告，數值不符 0**。
2. **實機 computed style 快照**（弱但能抓到串接順序問題）：Playwright 走訪
   15 個分頁 × 2 種寬度，擷取 681 個元素的 fontSize/padding/margin/radius/gap/
   color/background。結果 **681/681 完全一致**。

### ⚠️ 踩過的坑（同樣的錯不要再犯）

第一版接線用正則「只要是 `.page-t` 的 font-size 就換成 `--text-display`」，
**不檢查原值**，結果把刻意的響應式階梯壓成同一個值：
`.page-t` 30→24px、`.card-t` 15→14px、`.kpi-v` 34→36px，共 40 處。
接著「還原」時又把 semantic 映射回它解析後的 primitive，
於是原本 `25px` 的變成 `--fs-24`，**資訊永久遺失**。

- **正確做法**：接 semantic 層時，只有「原值 == semantic 解析後的值」才替換；
  不相符者保留 primitive，因為那是刻意的響應式覆寫。
- **快照只抓到 40 處中的 5 處**（取樣沒涵蓋到其餘）。
  **位置比對才是可靠的檢查**，不要只靠快照就宣稱沒問題。

### 現況

- 三檔硬編值已全部 token 化（剩餘 15 處 `border-radius` 為 `50%`／`999px` 等非階梯值）。
- semantic 層目前接了 33 處（KPI、按鈕、表格、卡片標題、警示、摘要卡）。
  其餘仍直接用 primitive —— 這是刻意的，多數是響應式階梯，不該被 semantic 壓平。
- 要擴大 semantic 覆蓋率，沿用上面的「數值相符才接線」規則。

## 下一步建議

0. **先讀「公開曝光現況」章節**。data.json 公開與 git 歷史未清仍是業主的
   **明示取捨**，不是待辦。`users` 已於 2026-09-30 經使用者同意移出 data.json，
   **不可加回**（`mask-identifiers.cjs --check` 會擋）。同節列出的四項防回歸（noindex、客戶名稱遮罩、姓名只留姓氏、
   匯入流程自動遮罩）則不可回退，CI 會擋。
1. 補一份正式 `TECHNICAL_HANDOFF.md` 給真人工程師閱讀，內容可從本文件整理成人類版。
2. ~~型號查詢頁手機實機確認~~ → **20260724-1/-2 已用 Playwright 完成**：
   查詢列固定在最上方、九種寬度無水平捲動、無文字截斷。若再改版請照
   「RWD 與可讀性」段的流程重跑。
3. 若後續要接交易別 5 換修率，先確認該 Excel 的型號與目前維修資料型號是否能對上。先前交集很少，不要硬塞成主功能。
4. **來源資料品質**（已回報使用者，需工廠端配合，非程式可解）：
   - `製令品號` 僅 15%、`製造日期` 22% 有值、`condition`（全新/整新）0% →
     「全新/整新責任歸屬」分析無法啟用（製造批次頁仍顯示待解鎖提示）。
   - 15% 記錄無序號，無法做重複維修追蹤。
   - `ZWDIO20` 在來源「故障零件總數」頁的整新數表頭誤打成 `ZWDUO20`；
     目前靠別名解析層自動修正，但根治要改 Excel。
   - `TS-1185-025C`（1,087 件）與 `TS-1185-025`（538 件）疑似同料，
     **使用者表示不確定、暫不合併**；若確認同料，加進 `parser.js` 的
     `normalizeKnownPartAlias`。
5. 各月機種涵蓋差異大（3月39種、5月24種、7月55種），共同機種僅 11 種。
   月趨勢已預設「只看每月都有的機種」，但若之後月份持續增加、共同機種
   繼續縮小，這個預設值可能要重新評估。
