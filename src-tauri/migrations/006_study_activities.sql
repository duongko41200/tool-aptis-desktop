CREATE TABLE IF NOT EXISTS study_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT NOT NULL,
    score INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
