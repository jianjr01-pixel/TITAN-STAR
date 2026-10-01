-- 登入失敗次數限制需要依帳號／來源 IP 與時間查詢
CREATE INDEX IF NOT EXISTS idx_login_logs_user_time ON login_logs(username, created_at);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip_time ON login_logs(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
