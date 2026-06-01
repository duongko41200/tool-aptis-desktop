use tauri::State;
use serde::{Deserialize, Serialize};
use rusqlite::params;
use std::sync::atomic::Ordering;
use crate::AppState;
use crate::services::gemini::GeminiClient;
use super::get_api_key;

#[derive(Debug, Serialize, Deserialize)]
pub struct CapturedContent {
    pub id: i64,
    pub content: String,
    pub category: String,
    pub folder: Option<String>,
    pub personal_notes: Option<String>,
    pub ai_summary: Option<String>,
    pub ai_vocabulary: Option<Vec<String>>,
    pub ai_collocations: Option<Vec<String>>,
    pub ai_idioms: Option<Vec<String>>,
    pub ai_processed: i64,
    pub created_at: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveContentResult {
    pub id: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchContentResult {
    pub items: Vec<CapturedContent>,
    pub total: i64,
}

#[tauri::command]
pub async fn save_captured_content(
    content: String,
    category: String,
    folder: Option<String>,
    tags: Option<Vec<String>>,
    personal_notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<SaveContentResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO captured_content (content, category, folder, personal_notes, ai_processed, created_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5)",
        params![content, category, folder, personal_notes, now],
    ).map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();

    if let Some(tag_list) = tags {
        for tag in tag_list {
            let _ = db.execute(
                "INSERT OR IGNORE INTO captured_tags (captured_content_id, tag) VALUES (?1, ?2)",
                params![id, tag],
            );
        }
    }
    Ok(SaveContentResult { id, created_at: now })
}

#[tauri::command]
pub async fn search_captured_content(
    query: Option<String>,
    _category: Option<String>,
    _folder: Option<String>,
    _date_from: Option<String>,
    _date_to: Option<String>,
    _tag: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    state: State<'_, AppState>,
) -> Result<SearchContentResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);

    // Build query based on whether we have a full-text search query
    let items: Vec<CapturedContent> = if let Some(ref q) = query {
        let fts_query = format!("{}*", q.trim());
        let mut stmt = db.prepare(
            "SELECT cc.id, cc.content, cc.category, cc.folder, cc.personal_notes,
                    cc.ai_summary, cc.ai_vocabulary, cc.ai_collocations, cc.ai_idioms,
                    cc.ai_processed, cc.created_at
             FROM captured_content cc
             INNER JOIN captured_content_fts fts ON cc.id = fts.rowid
             WHERE captured_content_fts MATCH ?1
             ORDER BY cc.created_at DESC LIMIT ?2 OFFSET ?3"
        ).map_err(|e| e.to_string())?;
        query_content_rows(&mut stmt, params![fts_query, limit, offset], &db)?
    } else {
        let mut stmt = db.prepare(
            "SELECT id, content, category, folder, personal_notes,
                    ai_summary, ai_vocabulary, ai_collocations, ai_idioms,
                    ai_processed, created_at
             FROM captured_content
             ORDER BY created_at DESC LIMIT ?1 OFFSET ?2"
        ).map_err(|e| e.to_string())?;
        query_content_rows(&mut stmt, params![limit, offset], &db)?
    };

    let total: i64 = db.query_row(
        "SELECT COUNT(*) FROM captured_content",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(SearchContentResult { items, total })
}

fn query_content_rows(
    stmt: &mut rusqlite::Statement,
    params: impl rusqlite::Params,
    db: &rusqlite::Connection,
) -> Result<Vec<CapturedContent>, String> {
    let rows = stmt.query_map(params, |row| {
        let id: i64 = row.get(0)?;
        let ai_vocab_json: Option<String> = row.get(6)?;
        let ai_colloc_json: Option<String> = row.get(7)?;
        let ai_idioms_json: Option<String> = row.get(8)?;
        Ok((id, CapturedContent {
            id,
            content: row.get(1)?,
            category: row.get(2)?,
            folder: row.get(3)?,
            personal_notes: row.get(4)?,
            ai_summary: row.get(5)?,
            ai_vocabulary: ai_vocab_json.as_deref().and_then(|s| serde_json::from_str(s).ok()),
            ai_collocations: ai_colloc_json.as_deref().and_then(|s| serde_json::from_str(s).ok()),
            ai_idioms: ai_idioms_json.as_deref().and_then(|s| serde_json::from_str(s).ok()),
            ai_processed: row.get(9)?,
            created_at: row.get(10)?,
            tags: Vec::new(),
        }))
    }).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows.filter_map(|r| r.ok()) {
        let (id, mut item) = row;
        // Fetch tags
        let mut tag_stmt = db.prepare("SELECT tag FROM captured_tags WHERE captured_content_id = ?1")
            .unwrap();
        item.tags = tag_stmt.query_map(params![id], |r| r.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        items.push(item);
    }
    Ok(items)
}

#[tauri::command]
pub async fn process_content_with_ai(
    id: i64,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<CapturedContent, String> {
    let content: String = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.query_row("SELECT content FROM captured_content WHERE id = ?1", params![id], |r| r.get(0))
            .map_err(|e| e.to_string())?
    };

    let api_key = get_api_key(&app)?;

    let system_prompt = r#"Extract information from the following text. Return a JSON object:
{
  "summary": "brief 1-2 sentence summary",
  "vocabulary": ["word1", "word2", ...],
  "collocations": ["phrase1", "phrase2", ...],
  "idioms": ["idiom1", "idiom2", ...]
}"#;

    let client = GeminiClient::new(api_key);
    let response = client.generate_content(system_prompt, &content).await?;
    let json: serde_json::Value = serde_json::from_str(&response)
        .map_err(|_| "Failed to parse AI response")?;

    let summary = json["summary"].as_str().map(|s| s.to_string());
    let vocabulary: Vec<String> = json["vocabulary"].as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();
    let collocations: Vec<String> = json["collocations"].as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();
    let idioms: Vec<String> = json["idioms"].as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    let vocab_json = serde_json::to_string(&vocabulary).unwrap_or_default();
    let colloc_json = serde_json::to_string(&collocations).unwrap_or_default();
    let idioms_json = serde_json::to_string(&idioms).unwrap_or_default();

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE captured_content SET ai_summary=?1, ai_vocabulary=?2, ai_collocations=?3, ai_idioms=?4, ai_processed=1 WHERE id=?5",
        params![summary, vocab_json, colloc_json, idioms_json, id],
    ).map_err(|e| e.to_string())?;

    let created_at: String = db.query_row("SELECT created_at FROM captured_content WHERE id=?1", params![id], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    Ok(CapturedContent {
        id,
        content,
        category: "general".to_string(),
        folder: None,
        personal_notes: None,
        ai_summary: summary,
        ai_vocabulary: Some(vocabulary),
        ai_collocations: Some(collocations),
        ai_idioms: Some(idioms),
        ai_processed: 1,
        created_at,
        tags: Vec::new(),
    })
}

#[tauri::command]
pub async fn toggle_clipboard_monitoring(
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.clipboard_monitoring_enabled.store(enabled, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn get_clipboard_status(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let enabled = state.clipboard_monitoring_enabled.load(Ordering::Relaxed);
    Ok(serde_json::json!({ "enabled": enabled }))
}

#[tauri::command]
pub async fn show_clipboard_popup(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    use tauri_plugin_positioner::{WindowExt, Position};

    if let Some(window) = app.get_webview_window("clipboard-popup") {
        let _ = window.move_window(Position::Center);
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn hide_clipboard_popup(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    if let Some(window) = app.get_webview_window("clipboard-popup") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
