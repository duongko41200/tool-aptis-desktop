use tauri::State;
use serde::{Deserialize, Serialize};
use rusqlite::params;
use crate::AppState;
use crate::services::{srs_v2, cloze_parser};

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Deck {
    pub id: i64,
    pub name: String,
    pub parent_deck_id: Option<i64>,
    pub full_name: String,
    pub created_at: String,
    pub new_count: i64,
    pub learning_count: i64,
    pub review_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: i64,
    pub deck_id: i64,
    pub template_type: String,
    pub front: String,
    pub back: Option<String>,
    pub example: Option<String>,
    pub personal_notes: Option<String>,
    pub tags: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Card {
    pub id: i64,
    pub note_id: i64,
    pub card_type: String,
    pub state: String,
    pub current_step: i64,
    pub due_date: String,
    pub interval_days: f64,
    pub ease_factor: f64,
    pub review_count: i64,
    pub suspended: i64,
    pub buried_until: Option<String>,
    pub flag_color: Option<String>,
    pub created_at: String,
    // Joined note fields for review display
    pub front: Option<String>,
    pub back: Option<String>,
    pub example: Option<String>,
    pub template_type: Option<String>,
    pub deck_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DueCardsResult {
    pub cards: Vec<Card>,
    pub new_count: i64,
    pub learning_count: i64,
    pub review_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RatingResult {
    pub next_due_date: String,
    pub new_interval_days: f64,
    pub new_state: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNoteResult {
    pub note: Note,
    pub cards: Vec<Card>,
}

// ── Deck Commands ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_decks(state: State<'_, AppState>) -> Result<Vec<Deck>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, name, parent_deck_id, created_at FROM decks ORDER BY name"
    ).map_err(|e| e.to_string())?;

    let raw: Vec<(i64, String, Option<i64>, String)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    // Build full names
    let name_map: std::collections::HashMap<i64, String> =
        raw.iter().map(|(id, name, _, _)| (*id, name.clone())).collect();

    let decks = raw.iter().map(|(id, name, parent_id, created_at)| {
        let full_name = if let Some(pid) = parent_id {
            let parent_full = name_map.get(pid).cloned().unwrap_or_default();
            format!("{}::{}", parent_full, name)
        } else {
            name.clone()
        };

        // Count due cards
        let now = chrono::Utc::now().to_rfc3339();
        let new_count: i64 = db.query_row(
            "WITH RECURSIVE dt AS (SELECT id FROM decks WHERE id=?1 UNION ALL SELECT d.id FROM decks d JOIN dt ON d.parent_deck_id=dt.id)
             SELECT COUNT(*) FROM cards c JOIN notes n ON c.note_id=n.id WHERE n.deck_id IN (SELECT id FROM dt) AND c.state='new' AND c.suspended=0 AND (c.buried_until IS NULL OR c.buried_until<=?2)",
            params![id, now], |r| r.get(0)
        ).unwrap_or(0);
        let learning_count: i64 = db.query_row(
            "WITH RECURSIVE dt AS (SELECT id FROM decks WHERE id=?1 UNION ALL SELECT d.id FROM decks d JOIN dt ON d.parent_deck_id=dt.id)
             SELECT COUNT(*) FROM cards c JOIN notes n ON c.note_id=n.id WHERE n.deck_id IN (SELECT id FROM dt) AND c.state='learning' AND c.due_date<=?2 AND c.suspended=0 AND (c.buried_until IS NULL OR c.buried_until<=?2)",
            params![id, now], |r| r.get(0)
        ).unwrap_or(0);
        let review_count: i64 = db.query_row(
            "WITH RECURSIVE dt AS (SELECT id FROM decks WHERE id=?1 UNION ALL SELECT d.id FROM decks d JOIN dt ON d.parent_deck_id=dt.id)
             SELECT COUNT(*) FROM cards c JOIN notes n ON c.note_id=n.id WHERE n.deck_id IN (SELECT id FROM dt) AND c.state='review' AND c.due_date<=?2 AND c.suspended=0 AND (c.buried_until IS NULL OR c.buried_until<=?2)",
            params![id, now], |r| r.get(0)
        ).unwrap_or(0);

        Deck { id: *id, name: name.clone(), parent_deck_id: *parent_id, full_name, created_at: created_at.clone(), new_count, learning_count, review_count }
    }).collect();

    Ok(decks)
}

#[tauri::command]
pub async fn create_deck(
    name: String,
    parent_deck_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Deck, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO decks (name, parent_deck_id, created_at) VALUES (?1, ?2, ?3)",
        params![name, parent_deck_id, now],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "A deck with that name already exists at this level.".to_string()
        } else { e.to_string() }
    })?;
    let id = db.last_insert_rowid();
    let full_name = if let Some(pid) = parent_deck_id {
        let parent: String = db.query_row("SELECT name FROM decks WHERE id=?1", params![pid], |r| r.get(0)).unwrap_or_default();
        format!("{}::{}", parent, name)
    } else { name.clone() };
    Ok(Deck { id, name, parent_deck_id, full_name, created_at: now, new_count: 0, learning_count: 0, review_count: 0 })
}

#[tauri::command]
pub async fn delete_deck(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM decks WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Note Commands ─────────────────────────────────────────────────────────────

fn generate_cards(db: &rusqlite::Connection, note: &Note) -> Result<Vec<Card>, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let mut cards = Vec::new();

    let card_types: Vec<(String, String)> = match note.template_type.as_str() {
        "basic" => vec![("forward".to_string(), note.front.clone())],
        "reverse" => vec![("reverse".to_string(), note.back.clone().unwrap_or_default())],
        "basic_reverse" => vec![
            ("forward".to_string(), note.front.clone()),
            ("reverse".to_string(), note.back.clone().unwrap_or_default()),
        ],
        "cloze" => {
            let cloze_cards = cloze_parser::parse_cloze(&note.front)?;
            cloze_cards.iter().map(|c| (c.card_type.clone(), c.front_rendered.clone())).collect()
        }
        _ => return Err(format!("Unknown template type: {}", note.template_type)),
    };

    for (card_type, _) in &card_types {
        db.execute(
            "INSERT OR IGNORE INTO cards (note_id, card_type, state, current_step, due_date, interval_days, ease_factor, review_count, suspended, created_at)
             VALUES (?1, ?2, 'new', 0, ?3, 0, 2.5, 0, 0, ?4)",
            params![note.id, card_type, now, now],
        ).map_err(|e| e.to_string())?;
        let card_id = db.last_insert_rowid();
        cards.push(Card {
            id: card_id, note_id: note.id, card_type: card_type.clone(),
            state: "new".to_string(), current_step: 0, due_date: now.clone(),
            interval_days: 0.0, ease_factor: 2.5, review_count: 0, suspended: 0,
            buried_until: None, flag_color: None, created_at: now.clone(),
            front: Some(note.front.clone()), back: note.back.clone(),
            example: note.example.clone(), template_type: Some(note.template_type.clone()),
            deck_id: Some(note.deck_id),
        });
    }
    Ok(cards)
}

#[tauri::command]
pub async fn create_note(
    deck_id: i64,
    template_type: String,
    front: String,
    back: Option<String>,
    example: Option<String>,
    tags: Option<String>,
    state: State<'_, AppState>,
) -> Result<CreateNoteResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO notes (deck_id, template_type, front, back, example, tags, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![deck_id, template_type, front, back, example, tags, now, now],
    ).map_err(|e| e.to_string())?;
    let note_id = db.last_insert_rowid();
    let note = Note { id: note_id, deck_id, template_type, front, back, example, personal_notes: None, tags, created_at: now.clone(), updated_at: now };
    let cards = generate_cards(&db, &note)?;
    Ok(CreateNoteResult { note, cards })
}

#[tauri::command]
pub async fn update_note(
    id: i64,
    front: Option<String>,
    back: Option<String>,
    example: Option<String>,
    tags: Option<String>,
    state: State<'_, AppState>,
) -> Result<CreateNoteResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(ref f) = front { db.execute("UPDATE notes SET front=?1, updated_at=?2 WHERE id=?3", params![f, now, id]).map_err(|e| e.to_string())?; }
    if let Some(ref b) = back { db.execute("UPDATE notes SET back=?1, updated_at=?2 WHERE id=?3", params![b, now, id]).map_err(|e| e.to_string())?; }
    if let Some(ref e) = example { db.execute("UPDATE notes SET example=?1, updated_at=?2 WHERE id=?3", params![e, now, id]).map_err(|e| e.to_string())?; }
    if let Some(ref t) = tags { db.execute("UPDATE notes SET tags=?1, updated_at=?2 WHERE id=?3", params![t, now, id]).map_err(|e| e.to_string())?; }

    let note: Note = db.query_row(
        "SELECT id, deck_id, template_type, front, back, example, personal_notes, tags, created_at, updated_at FROM notes WHERE id=?1",
        params![id], |row| Ok(Note {
            id: row.get(0)?, deck_id: row.get(1)?, template_type: row.get(2)?,
            front: row.get(3)?, back: row.get(4)?, example: row.get(5)?,
            personal_notes: row.get(6)?, tags: row.get(7)?,
            created_at: row.get(8)?, updated_at: row.get(9)?,
        }),
    ).map_err(|e| e.to_string())?;

    // Re-generate cards if front changed (important for cloze)
    if front.is_some() && note.template_type == "cloze" {
        db.execute("DELETE FROM cards WHERE note_id=?1", params![id]).map_err(|e| e.to_string())?;
    }
    let cards = generate_cards(&db, &note)?;
    Ok(CreateNoteResult { note, cards })
}

#[tauri::command]
pub async fn delete_note(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM notes WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_notes_for_deck(
    deck_id: i64,
    include_subdecks: bool,
    tag_filter: Option<String>,
    search: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Note>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sql = if include_subdecks {
        "WITH RECURSIVE dt AS (SELECT id FROM decks WHERE id=?1 UNION ALL SELECT d.id FROM decks d JOIN dt ON d.parent_deck_id=dt.id)
         SELECT id, deck_id, template_type, front, back, example, personal_notes, tags, created_at, updated_at
         FROM notes WHERE deck_id IN (SELECT id FROM dt) ORDER BY created_at DESC"
    } else {
        "SELECT id, deck_id, template_type, front, back, example, personal_notes, tags, created_at, updated_at
         FROM notes WHERE deck_id=?1 ORDER BY created_at DESC"
    };
    let mut stmt = db.prepare(sql).map_err(|e| e.to_string())?;
    let notes: Vec<Note> = stmt.query_map(params![deck_id], |row| Ok(Note {
        id: row.get(0)?, deck_id: row.get(1)?, template_type: row.get(2)?,
        front: row.get(3)?, back: row.get(4)?, example: row.get(5)?,
        personal_notes: row.get(6)?, tags: row.get(7)?,
        created_at: row.get(8)?, updated_at: row.get(9)?,
    })).map_err(|e| e.to_string())?.filter_map(|r| r.ok())
    .filter(|n| {
        let tag_ok = tag_filter.as_ref().map_or(true, |t| n.tags.as_deref().unwrap_or("").contains(t.as_str()));
        let search_ok = search.as_ref().map_or(true, |s| n.front.to_lowercase().contains(&s.to_lowercase()) || n.back.as_deref().unwrap_or("").to_lowercase().contains(&s.to_lowercase()));
        tag_ok && search_ok
    }).collect();
    Ok(notes)
}

// ── Card / Review Commands ────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_due_cards_for_deck(
    deck_id: i64,
    include_subdecks: bool,
    state: State<'_, AppState>,
) -> Result<DueCardsResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    let deck_filter = if include_subdecks {
        "WITH RECURSIVE dt AS (SELECT id FROM decks WHERE id=?1 UNION ALL SELECT d.id FROM decks d JOIN dt ON d.parent_deck_id=dt.id) SELECT id FROM dt"
    } else {
        "SELECT ?1"
    };

    let sql = format!(
        "SELECT c.id, c.note_id, c.card_type, c.state, c.current_step, c.due_date,
                c.interval_days, c.ease_factor, c.review_count, c.suspended, c.buried_until, c.flag_color, c.created_at,
                n.front, n.back, n.example, n.template_type, n.deck_id
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         WHERE n.deck_id IN ({deck_filter})
           AND c.suspended = 0
           AND (c.buried_until IS NULL OR c.buried_until <= ?2)
           AND (c.state = 'new' OR c.due_date <= ?2)
         ORDER BY
           CASE c.state WHEN 'learning' THEN 0 WHEN 'review' THEN 1 ELSE 2 END,
           c.due_date ASC
         LIMIT 100"
    );

    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let cards: Vec<Card> = stmt.query_map(params![deck_id, now], |row| Ok(Card {
        id: row.get(0)?, note_id: row.get(1)?, card_type: row.get(2)?,
        state: row.get(3)?, current_step: row.get(4)?, due_date: row.get(5)?,
        interval_days: row.get(6)?, ease_factor: row.get(7)?, review_count: row.get(8)?,
        suspended: row.get(9)?, buried_until: row.get(10)?, flag_color: row.get(11)?,
        created_at: row.get(12)?,
        front: row.get(13)?, back: row.get(14)?, example: row.get(15)?,
        template_type: row.get(16)?, deck_id: row.get(17)?,
    })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    let new_count = cards.iter().filter(|c| c.state == "new").count() as i64;
    let learning_count = cards.iter().filter(|c| c.state == "learning").count() as i64;
    let review_count = cards.iter().filter(|c| c.state == "review").count() as i64;

    Ok(DueCardsResult { cards, new_count, learning_count, review_count })
}

#[tauri::command]
pub async fn submit_card_rating(
    card_id: i64,
    rating: String,
    state: State<'_, AppState>,
) -> Result<RatingResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let (cur_state, cur_step, interval_days, ease_factor): (String, i64, f64, f64) = db.query_row(
        "SELECT state, current_step, interval_days, ease_factor FROM cards WHERE id=?1",
        params![card_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).map_err(|e| e.to_string())?;

    let result = srs_v2::calculate_next(&cur_state, cur_step, &rating, interval_days, ease_factor);
    let new_due = chrono::Utc::now() + chrono::Duration::minutes(result.due_offset_minutes);
    let new_due_str = new_due.to_rfc3339();
    let now_str = chrono::Utc::now().to_rfc3339();

    db.execute(
        "UPDATE cards SET state=?1, current_step=?2, due_date=?3, interval_days=?4, ease_factor=?5, review_count=review_count+1 WHERE id=?6",
        params![result.new_state, result.new_step, new_due_str, result.new_interval_days, result.new_ease_factor, card_id],
    ).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO review_logs (card_id, rating, state_before, interval_before, interval_after, reviewed_at) VALUES (?1,?2,?3,?4,?5,?6)",
        params![card_id, rating, cur_state, interval_days, result.new_interval_days, now_str],
    ).map_err(|e| e.to_string())?;

    Ok(RatingResult {
        next_due_date: new_due_str,
        new_interval_days: result.new_interval_days,
        new_state: result.new_state,
    })
}

#[tauri::command]
pub async fn bury_card(card_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // Bury until tomorrow 04:00
    let tomorrow = (chrono::Utc::now() + chrono::Duration::hours(28)).to_rfc3339();
    db.execute("UPDATE cards SET buried_until=?1 WHERE id=?2", params![tomorrow, card_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn suspend_card(card_id: i64, suspended: bool, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE cards SET suspended=?1 WHERE id=?2", params![suspended as i64, card_id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn flag_card(card_id: i64, color: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE cards SET flag_color=?1 WHERE id=?2", params![color, card_id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ── Session persistence ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct NoteRatingEntry {
    pub note_id: i64,
    pub rating: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionStatsInput {
    pub again: i64,
    pub hard: i64,
    pub good: i64,
    pub easy: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeckSession {
    pub deck_id: i64,
    pub again: i64,
    pub hard: i64,
    pub good: i64,
    pub easy: i64,
    pub note_ratings: Vec<NoteRatingEntry>,
    pub last_session_at: String,
}

/// Save session results: aggregate stats + per-note last rating.
/// Called once when the review session ends (last card rated).
#[tauri::command]
pub async fn save_deck_session(
    deck_id: i64,
    stats: SessionStatsInput,
    note_ratings: Vec<NoteRatingEntry>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // Upsert aggregate stats
    db.execute(
        "INSERT INTO deck_session_stats (deck_id, again_count, hard_count, good_count, easy_count, last_session_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(deck_id) DO UPDATE SET
           again_count      = excluded.again_count,
           hard_count       = excluded.hard_count,
           good_count       = excluded.good_count,
           easy_count       = excluded.easy_count,
           last_session_at  = excluded.last_session_at",
        params![deck_id, stats.again, stats.hard, stats.good, stats.easy, now],
    ).map_err(|e| e.to_string())?;

    // Upsert per-note last ratings
    for entry in &note_ratings {
        db.execute(
            "INSERT INTO note_session_ratings (note_id, deck_id, last_rating, updated_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(note_id, deck_id) DO UPDATE SET
               last_rating = excluded.last_rating,
               updated_at  = excluded.updated_at",
            params![entry.note_id, deck_id, entry.rating, now],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Load persisted session data for a deck (stats + per-note ratings).
#[tauri::command]
pub async fn get_deck_session(
    deck_id: i64,
    state: State<'_, AppState>,
) -> Result<DeckSession, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Aggregate stats
    let stats_result = db.query_row(
        "SELECT again_count, hard_count, good_count, easy_count, last_session_at
         FROM deck_session_stats WHERE deck_id = ?1",
        params![deck_id],
        |row| Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, i64>(2)?,
            row.get::<_, i64>(3)?,
            row.get::<_, String>(4)?,
        )),
    );

    let (again, hard, good, easy, last_session_at) = match stats_result {
        Ok(r) => r,
        Err(_) => return Ok(DeckSession {
            deck_id, again: 0, hard: 0, good: 0, easy: 0,
            note_ratings: vec![], last_session_at: String::new(),
        }),
    };

    // Per-note ratings
    let mut stmt = db.prepare(
        "SELECT note_id, last_rating FROM note_session_ratings WHERE deck_id = ?1"
    ).map_err(|e| e.to_string())?;

    let note_ratings: Vec<NoteRatingEntry> = stmt
        .query_map(params![deck_id], |row| {
            Ok(NoteRatingEntry { note_id: row.get(0)?, rating: row.get(1)? })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(DeckSession { deck_id, again, hard, good, easy, note_ratings, last_session_at })
}

#[tauri::command]
pub async fn create_note_from_clipboard(
    deck_id: i64,
    template_type: String,
    front: String,
    back: Option<String>,
    tags: Option<String>,
    state: State<'_, AppState>,
) -> Result<CreateNoteResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO notes (deck_id, template_type, front, back, tags, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![deck_id, template_type, front, back, tags, now, now],
    ).map_err(|e| e.to_string())?;
    let note_id = db.last_insert_rowid();
    let note = Note { id: note_id, deck_id, template_type, front, back, example: None, personal_notes: None, tags, created_at: now.clone(), updated_at: now };
    let cards = generate_cards(&db, &note)?;
    Ok(CreateNoteResult { note, cards })
}
