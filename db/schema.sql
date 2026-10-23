CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id INTEGER NOT NULL CHECK (court_id BETWEEN 1 AND 5),
  date TEXT NOT NULL,
  start_hour INTEGER NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE (court_id, date, start_hour)
);

CREATE INDEX IF NOT EXISTS idx_reservations_user_date
  ON reservations(user_id, date, start_hour);
