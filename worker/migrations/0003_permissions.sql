-- 權限群組（20261002）：
--   管理權限 admin    ＝ role='admin'（一律可上傳）
--   更新報表權限 uploader ＝ role='user' 且 can_upload=1
--   瀏覽權限 viewer   ＝ role='user' 且 can_upload=0
-- 只新增欄位、不重建 users 表，既有帳號、登入狀態與紀錄都不受影響。
-- 既有的一般使用者預設為「瀏覽權限」，需要上傳的人請由管理員在後台調整。
ALTER TABLE users ADD COLUMN can_upload INTEGER NOT NULL DEFAULT 0;
UPDATE users SET can_upload = 1 WHERE role = 'admin';
