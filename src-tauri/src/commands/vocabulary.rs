use tauri::State;
use serde::{Deserialize, Serialize};
use rusqlite::params;
use crate::AppState;
use crate::services::srs;

#[derive(Debug, Serialize, Deserialize)]
pub struct VocabularyEntry {
    pub id: i64,
    pub word: String,
    pub phonetics: Option<String>,
    pub meaning: String,
    pub example: Option<String>,
    pub personal_notes: Option<String>,
    pub image_path: Option<String>,
    pub tags: Option<String>,
    pub interval_days: f64,
    pub ease_factor: f64,
    pub due_date: String,
    pub review_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DueCardsResult {
    pub cards: Vec<VocabularyEntry>,
    pub total_due: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReviewSessionInfo {
    pub id: i64,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub cards_reviewed: i64,
    pub cards_again: i64,
    pub cards_hard: i64,
    pub cards_good: i64,
    pub cards_easy: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReviewRatingResult {
    pub next_due_date: String,
    pub new_interval_days: f64,
}

#[derive(Debug, Deserialize)]
pub struct AddVocabEntry {
    pub word: String,
    pub phonetics: Option<String>,
    pub meaning: String,
    pub example: Option<String>,
    pub personal_notes: Option<String>,
    pub tags: Option<String>,
}

#[tauri::command]
pub async fn add_vocabulary_entry(
    entry: AddVocabEntry,
    state: State<'_, AppState>,
) -> Result<VocabularyEntry, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO vocabulary_entries (word, phonetics, meaning, example, personal_notes, tags, interval_days, ease_factor, due_date, review_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 2.5, ?7, 0, ?8, ?9)",
        params![entry.word, entry.phonetics, entry.meaning, entry.example, entry.personal_notes, entry.tags, now, now, now],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Word already exists".to_string()
        } else {
            e.to_string()
        }
    })?;
    let id = db.last_insert_rowid();
    Ok(VocabularyEntry {
        id,
        word: entry.word,
        phonetics: entry.phonetics,
        meaning: entry.meaning,
        example: entry.example,
        personal_notes: entry.personal_notes,
        image_path: None,
        tags: entry.tags,
        interval_days: 0.0,
        ease_factor: 2.5,
        due_date: now.clone(),
        review_count: 0,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn get_due_cards(
    state: State<'_, AppState>,
) -> Result<DueCardsResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, word, phonetics, meaning, example, personal_notes, image_path, tags,
                interval_days, ease_factor, due_date, review_count, created_at, updated_at
         FROM vocabulary_entries
         WHERE due_date <= datetime('now')
         ORDER BY due_date ASC"
    ).map_err(|e| e.to_string())?;

    let cards: Vec<VocabularyEntry> = stmt.query_map([], |row| {
        Ok(VocabularyEntry {
            id: row.get(0)?,
            word: row.get(1)?,
            phonetics: row.get(2)?,
            meaning: row.get(3)?,
            example: row.get(4)?,
            personal_notes: row.get(5)?,
            image_path: row.get(6)?,
            tags: row.get(7)?,
            interval_days: row.get(8)?,
            ease_factor: row.get(9)?,
            due_date: row.get(10)?,
            review_count: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    let total_due = cards.len();
    Ok(DueCardsResult { cards, total_due })
}

#[tauri::command]
pub async fn get_vocabulary_list(
    state: State<'_, AppState>,
) -> Result<Vec<VocabularyEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, word, phonetics, meaning, example, personal_notes, image_path, tags,
                interval_days, ease_factor, due_date, review_count, created_at, updated_at
         FROM vocabulary_entries ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let entries = stmt.query_map([], |row| {
        Ok(VocabularyEntry {
            id: row.get(0)?,
            word: row.get(1)?,
            phonetics: row.get(2)?,
            meaning: row.get(3)?,
            example: row.get(4)?,
            personal_notes: row.get(5)?,
            image_path: row.get(6)?,
            tags: row.get(7)?,
            interval_days: row.get(8)?,
            ease_factor: row.get(9)?,
            due_date: row.get(10)?,
            review_count: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(entries)
}

#[tauri::command]
pub async fn start_review_session(
    state: State<'_, AppState>,
) -> Result<ReviewSessionInfo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO review_sessions (started_at) VALUES (?1)",
        params![now],
    ).map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();
    Ok(ReviewSessionInfo {
        id,
        started_at: now,
        ended_at: None,
        cards_reviewed: 0,
        cards_again: 0,
        cards_hard: 0,
        cards_good: 0,
        cards_easy: 0,
    })
}

#[tauri::command]
pub async fn end_review_session(
    id: i64,
    state: State<'_, AppState>,
) -> Result<ReviewSessionInfo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // Compute aggregate stats from review_cards
    let (total, again, hard, good, easy): (i64, i64, i64, i64, i64) = db.query_row(
        "SELECT COUNT(*),
                SUM(CASE WHEN rating='again' THEN 1 ELSE 0 END),
                SUM(CASE WHEN rating='hard' THEN 1 ELSE 0 END),
                SUM(CASE WHEN rating='good' THEN 1 ELSE 0 END),
                SUM(CASE WHEN rating='easy' THEN 1 ELSE 0 END)
         FROM review_cards WHERE review_session_id = ?1",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
    ).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE review_sessions SET ended_at=?1, cards_reviewed=?2, cards_again=?3, cards_hard=?4, cards_good=?5, cards_easy=?6 WHERE id=?7",
        params![now, total, again, hard, good, easy, id],
    ).map_err(|e| e.to_string())?;

    let started_at: String = db.query_row(
        "SELECT started_at FROM review_sessions WHERE id=?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    Ok(ReviewSessionInfo {
        id,
        started_at,
        ended_at: Some(now),
        cards_reviewed: total,
        cards_again: again,
        cards_hard: hard,
        cards_good: good,
        cards_easy: easy,
    })
}

#[tauri::command]
pub async fn submit_review_rating(
    review_session_id: i64,
    vocabulary_entry_id: i64,
    rating: String,
    state: State<'_, AppState>,
) -> Result<ReviewRatingResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (interval_days, ease_factor): (f64, f64) = db.query_row(
        "SELECT interval_days, ease_factor FROM vocabulary_entries WHERE id = ?1",
        params![vocabulary_entry_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    let (new_interval, new_ease) = srs::calculate_next_interval(interval_days, ease_factor, &rating);

    let now = chrono::Utc::now();
    let new_due = now + chrono::Duration::seconds((new_interval * 86400.0) as i64);
    let new_due_str = new_due.to_rfc3339();
    let now_str = now.to_rfc3339();

    db.execute(
        "UPDATE vocabulary_entries SET interval_days=?1, ease_factor=?2, due_date=?3, review_count=review_count+1, updated_at=?4 WHERE id=?5",
        params![new_interval, new_ease, new_due_str, now_str, vocabulary_entry_id],
    ).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO review_cards (review_session_id, vocabulary_entry_id, rating, interval_before, interval_after, reviewed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![review_session_id, vocabulary_entry_id, rating, interval_days, new_interval, now_str],
    ).map_err(|e| e.to_string())?;

    Ok(ReviewRatingResult {
        next_due_date: new_due_str,
        new_interval_days: new_interval,
    })
}
