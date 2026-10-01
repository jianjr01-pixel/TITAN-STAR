// 產生第一個管理員帳號的 SQL（在本機執行，不會連線或寫入任何資料庫）。
// 用法：node scripts/create-admin.mjs <帳號> <暫時密碼至少10碼> [顯示名稱]
// 再執行：npx wrangler d1 execute titan-star-auth --remote --command "<輸出的 SQL>"
// Windows PowerShell 建議加 --out=admin.sql 直接寫檔（UTF-8，無 BOM），再用 --file=admin.sql 執行，
// 避免 PowerShell 的 > 轉成 UTF-16 或引號被吃掉。執行完請刪除 admin.sql。
// 登入後系統會要求立即改密碼；請勿把輸出的 SQL 存進版本庫。
import { webcrypto as crypto } from 'node:crypto';
import fs from 'node:fs';
import { passwordHash, validUsername, validPassword } from '../src/index.js';

const args = process.argv.slice(2);
const outArg = args.find(a => a.startsWith('--out='));
const [username, password, displayName = ''] = args.filter(a => !a.startsWith('--out='));
if (!validUsername(username) || !validPassword(password)) {
  console.error('用法：node scripts/create-admin.mjs <帳號(3–64 碼英數字)> <暫時密碼(至少10碼)> [顯示名稱]');
  process.exit(1);
}
const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
const hash = await passwordHash(password, salt);
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const sql = `INSERT INTO users (username,display_name,password_hash,password_salt,role,must_change_password) VALUES (${q(username)},${q(displayName)},${q(hash)},${q(salt)},'admin',1);`;
if (outArg) {
  const file = outArg.slice(6);
  fs.writeFileSync(file, sql + '\n', 'utf8');
  console.log(`已寫入 ${file}。接著執行：npx wrangler d1 execute titan-star-auth --remote --file=${file}，完成後刪除該檔。`);
} else {
  console.log(sql);
}
