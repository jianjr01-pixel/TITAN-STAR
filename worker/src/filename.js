// 與 monthly-source.js 的 monthInfo() 相同的 date 檔名規則。
// Worker 不能直接載入瀏覽器 UMD 檔，所以在這裡保留一份，並由
// tests/worker-filename.test.mjs 逐一比對兩邊結果，避免規則再次分歧。
const REPAIR = /^(\d{2,4})\s*年\s*(\d{1,2})\s*月維修報表(?:[-_\s]*(更正版|修正版|v)(\d*)?)?\.xlsx$/i;
const REFURB = /^(\d{2,4})\s*年\s*(\d{1,2})\s*月整新故障(?:[-_\s]*(更正版|修正版|v)(\d*)?)?\.xlsx$/i;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function uploadFileInfo(name) {
  if (typeof name !== 'string' || !name || name.length > 120) return null;
  if (/[\\/\u0000-\u001f]/.test(name) || name.startsWith('~$')) return null;
  const normalized = name.normalize('NFKC');
  const match = normalized.match(REPAIR) || normalized.match(REFURB);
  if (!match) return null;
  let year = Number(match[1]);
  if (year < 1911) year += 1911;
  const month = Number(match[2]);
  if (year < 2000 || year > 2200 || month < 1 || month > 12) return null;
  return {
    kind: REFURB.test(normalized) ? 'refurbishment' : 'repair',
    month: `${year}-${String(month).padStart(2, '0')}`,
    revision: match[3] ? Number(match[4] || 1) : 0,
  };
}
