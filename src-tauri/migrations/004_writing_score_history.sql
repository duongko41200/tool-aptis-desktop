CREATE TABLE IF NOT EXISTS writing_score_history (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    exam_title TEXT NOT NULL,
    letter_type TEXT NOT NULL CHECK(letter_type IN ('formal', 'informal')),
    essay TEXT NOT NULL,
    result_json TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    saved_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wsh_exam_id ON writing_score_history(exam_id);
CREATE INDEX IF NOT EXISTS idx_wsh_saved_at ON writing_score_history(saved_at);
