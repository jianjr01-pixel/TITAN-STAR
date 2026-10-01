# TITAN-STAR 登入服務（Cloudflare Worker + D1）

網站的帳號、密碼與登入紀錄都由這個 Worker 保存與驗證。公開的 `data.json` 不再包含任何帳號資料。
在完成下列設定之前，`main` 分支的 GitHub Pages 部署會被 `scripts/check-auth-config.mjs --strict` 擋下，避免上線後沒有人能登入。

## 一次性設定

1. 安裝相依套件並登入 Cloudflare：

   ```sh
   cd worker
   npm install
   npx wrangler login
   ```

2. 建立 D1 資料庫，把輸出的 `database_id` 填進 `wrangler.jsonc`：

   ```sh
   npx wrangler d1 create titan-star-auth
   ```

3. 套用資料表：

   ```sh
   npm run db:migrate
   ```

4. 設定 GitHub Token（後台「上傳每月 Excel」用）。請建立 **Fine-grained token**，只授權 `jianjr01-pixel/TITAN-STAR` 一個倉庫、權限只開 **Contents: Read and write**：

   ```sh
   npx wrangler secret put GITHUB_TOKEN
   ```

5. 部署，記下輸出的 `https://titan-star-auth.<帳號>.workers.dev` 網址：

   ```sh
   npm run deploy
   ```

6. 建立第一個管理員。下列指令只在本機產生 SQL，不會連線；暫時密碼至少 10 碼，登入後會被要求立刻修改：

   ```sh
   node scripts/create-admin.mjs <管理員帳號> <暫時密碼> [顯示名稱] --out=admin.sql
   npx wrangler d1 execute titan-star-auth --remote --file=admin.sql
   ```

   `admin.sql` 含密碼雜湊，執行完請立即刪除（Windows：`Remove-Item admin.sql`）。`.gitignore` 已排除這個檔名，避免誤提交。
   在 Windows PowerShell 請用 `--out=`，不要用 `>` 導向：PowerShell 5.1 的 `>` 會把檔案存成 UTF-16，wrangler 讀不懂。

7. 把第 5 步的網址填進專案根目錄的 `auth-config.js`，再執行 `node build.js` 重建離線單檔，一起提交。

## 安全設計摘要

- 密碼以 PBKDF2-SHA256（100,000 次，Cloudflare Workers 的上限）加隨機 salt 保存；登入 token 只保存 SHA-256 雜湊，有效 8 小時。
- 同一帳號 15 分鐘內失敗 5 次，或同一來源 IP 失敗 20 次，暫停登入 15 分鐘。
- 管理員若仍是暫時密碼，必須先改密碼才能使用後台。
- 改密碼、重設密碼後，其他裝置上的舊登入會失效。
- 新增、刪除帳號、重設密碼、上傳 Excel 都會寫入登入與操作紀錄；紀錄只保存帳號與 IP 雜湊，不保存 IP 原文。
- 上傳檔名規則與 `monthly-source.js` 相同（由 `tests/worker.test.mjs` 比對），且會檢查檔案確實是 .xlsx。
- `ALLOWED_ORIGIN` 預設只允許 `https://jianjr01-pixel.github.io` 跨網域呼叫。離線單檔版 `TITAN-STAR.html` 直接用瀏覽器開啟時，來源是 `null`，預設無法登入；若確定需要，可在 `wrangler.jsonc` 改成 `"https://jianjr01-pixel.github.io,null"`。登入使用 Bearer token 而非 cookie，開放 `null` 不會產生跨站請求偽造風險，但任何本機 HTML 都能嘗試呼叫登入 API（仍受失敗次數限制）。

## 重要限制

登入只控制「網站畫面」的使用。`date/` 裡的 Excel 與 `data.json` 放在公開的 GitHub 倉庫與 Pages 上，知道網址的人仍可直接下載。若資料不應公開，需要把倉庫改為私有並改由 Worker 代為讀取資料，這是另一項架構調整。
