use tauri::State;
use serde::{Deserialize, Serialize};
use rusqlite::params;
use crate::AppState;
use crate::services::stt;
use super::get_api_key;

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoSession {
    pub id: i64,
    pub youtube_url: String,
    pub title: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration_seconds: Option<i64>,
    pub repeat_start_ms: Option<i64>,
    pub repeat_end_ms: Option<i64>,
    pub loop_mode: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubtitleEntry {
    pub id: i64,
    pub video_session_id: i64,
    pub start_ms: i64,
    pub end_ms: i64,
    pub text: String,
    pub original_text: Option<String>,
    pub sequence: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeleprompterSession {
    pub id: i64,
    pub source_text: String,
    pub scroll_speed: f64,
    pub font_size: i64,
    pub background_color: String,
    pub text_color: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Recording {
    pub id: i64,
    pub session_type: String,
    pub session_id: i64,
    pub audio_path: String,
    pub duration_ms: Option<i64>,
    pub transcription: Option<String>,
    pub accuracy_score: Option<f64>,
    pub missed_word_pct: Option<f64>,
    pub mispronounced_words: Option<Vec<String>>,
    pub reading_speed_wpm: Option<f64>,
    pub created_at: String,
}

#[tauri::command]
pub async fn create_video_session(
    youtube_url: String,
    state: State<'_, AppState>,
) -> Result<VideoSession, String> {
    // Fetch title from YouTube oEmbed
    let oembed_url = format!(
        "https://www.youtube.com/oembed?url={}&format=json",
        urlencoding::encode(&youtube_url)
    );
    let (title, thumbnail_url) = match reqwest::get(&oembed_url).await {
        Ok(resp) => {
            let json: serde_json::Value = resp.json().await.unwrap_or_default();
            (
                json["title"].as_str().map(|s| s.to_string()),
                json["thumbnail_url"].as_str().map(|s| s.to_string()),
            )
        }
        Err(_) => (None, None),
    };

    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO video_sessions (youtube_url, title, thumbnail_url, loop_mode, created_at, updated_at)
         VALUES (?1, ?2, ?3, 0, ?4, ?5)",
        params![youtube_url, title, thumbnail_url, now, now],
    ).map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();
    Ok(VideoSession {
        id,
        youtube_url,
        title,
        thumbnail_url,
        duration_seconds: None,
        repeat_start_ms: None,
        repeat_end_ms: None,
        loop_mode: 0,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[derive(Debug, Deserialize)]
struct SrtCue {
    start_ms: i64,
    end_ms: i64,
    text: String,
}

fn parse_srt(srt: &str) -> Vec<SrtCue> {
    let mut cues = Vec::new();
    let blocks: Vec<&str> = srt.split("\n\n").collect();
    for block in blocks {
        let lines: Vec<&str> = block.trim().lines().collect();
        if lines.len() < 3 { continue; }
        // lines[0] = sequence number, lines[1] = timestamp, lines[2..] = text
        let timestamps = lines[1];
        let parts: Vec<&str> = timestamps.split(" --> ").collect();
        if parts.len() != 2 { continue; }
        let start_ms = parse_srt_time(parts[0]);
        let end_ms = parse_srt_time(parts[1]);
        let text = lines[2..].join(" ");
        cues.push(SrtCue { start_ms, end_ms, text });
    }
    cues
}

fn parse_srt_time(s: &str) -> i64 {
    // Format: HH:MM:SS,mmm
    let s = s.trim();
    let (hms, ms) = s.split_once(',').unwrap_or((s, "0"));
    let parts: Vec<&str> = hms.split(':').collect();
    if parts.len() != 3 { return 0; }
    let h: i64 = parts[0].parse().unwrap_or(0);
    let m: i64 = parts[1].parse().unwrap_or(0);
    let sec: i64 = parts[2].parse().unwrap_or(0);
    let millis: i64 = ms.parse().unwrap_or(0);
    (h * 3600 + m * 60 + sec) * 1000 + millis
}

#[tauri::command]
pub async fn import_subtitles(
    session_id: i64,
    srt_content: String,
    state: State<'_, AppState>,
) -> Result<Vec<SubtitleEntry>, String> {
    let cues = parse_srt(&srt_content);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // Remove existing subtitles for this session
    db.execute("DELETE FROM subtitle_entries WHERE video_session_id = ?1", params![session_id])
        .map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for (i, cue) in cues.iter().enumerate() {
        db.execute(
            "INSERT INTO subtitle_entries (video_session_id, start_ms, end_ms, text, original_text, sequence)
             VALUES (?1, ?2, ?3, ?4, ?4, ?5)",
            params![session_id, cue.start_ms, cue.end_ms, cue.text, (i + 1) as i64],
        ).map_err(|e| e.to_string())?;
        let id = db.last_insert_rowid();
        entries.push(SubtitleEntry {
            id,
            video_session_id: session_id,
            start_ms: cue.start_ms,
            end_ms: cue.end_ms,
            text: cue.text.clone(),
            original_text: Some(cue.text.clone()),
            sequence: (i + 1) as i64,
        });
    }
    Ok(entries)
}

#[tauri::command]
pub async fn update_subtitle_entry(
    id: i64,
    text: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE subtitle_entries SET text = ?1 WHERE id = ?2", params![text, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_subtitles_for_session(
    session_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<SubtitleEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, video_session_id, start_ms, end_ms, text, original_text, sequence
         FROM subtitle_entries WHERE video_session_id = ?1 ORDER BY sequence"
    ).map_err(|e| e.to_string())?;
    let entries = stmt.query_map(params![session_id], |row| {
        Ok(SubtitleEntry {
            id: row.get(0)?,
            video_session_id: row.get(1)?,
            start_ms: row.get(2)?,
            end_ms: row.get(3)?,
            text: row.get(4)?,
            original_text: row.get(5)?,
            sequence: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(entries)
}

#[tauri::command]
pub async fn create_teleprompter_session(
    source_text: String,
    state: State<'_, AppState>,
) -> Result<TeleprompterSession, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO teleprompter_sessions (source_text, scroll_speed, font_size, background_color, text_color, created_at, updated_at)
         VALUES (?1, 1.0, 32, '#000000', '#FFFFFF', ?2, ?3)",
        params![source_text, now, now],
    ).map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();
    Ok(TeleprompterSession {
        id,
        source_text,
        scroll_speed: 1.0,
        font_size: 32,
        background_color: "#000000".to_string(),
        text_color: "#FFFFFF".to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub async fn update_teleprompter_session(
    id: i64,
    updates: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(speed) = updates.get("scroll_speed").and_then(|v| v.as_f64()) {
        db.execute("UPDATE teleprompter_sessions SET scroll_speed = ?1, updated_at = ?2 WHERE id = ?3",
            params![speed, now, id]).map_err(|e| e.to_string())?;
    }
    if let Some(size) = updates.get("font_size").and_then(|v| v.as_i64()) {
        db.execute("UPDATE teleprompter_sessions SET font_size = ?1, updated_at = ?2 WHERE id = ?3",
            params![size, now, id]).map_err(|e| e.to_string())?;
    }
    Ok(())
}


#[tauri::command]
pub async fn save_recording(
    session_type: String,
    session_id: i64,
    audio_data: Vec<u8>,
    duration_ms: i64,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Recording, String> {
    // Save audio file
    let audio_dir = state.app_data_dir.join("recordings");
    std::fs::create_dir_all(&audio_dir).map_err(|e| e.to_string())?;
    let now = chrono::Utc::now();
    let filename = format!("recording_{}.webm", now.timestamp_millis());
    let audio_path = audio_dir.join(&filename);
    std::fs::write(&audio_path, &audio_data).map_err(|e| e.to_string())?;
    let audio_path_str = audio_path.to_string_lossy().to_string();

    // Transcribe
    let api_key = get_api_key(&app)?;
    let transcription = stt::transcribe_audio(audio_data, api_key).await?;

    // Get reference text
    let reference_text = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        match session_type.as_str() {
            "shadowing" => {
                // Get all subtitle text for the session
                let mut stmt = db.prepare(
                    "SELECT text FROM subtitle_entries WHERE video_session_id = ?1 ORDER BY sequence"
                ).map_err(|e| e.to_string())?;
                let texts: Vec<String> = stmt.query_map(params![session_id], |row| row.get(0))
                    .map_err(|e| e.to_string())?
                    .filter_map(|r| r.ok())
                    .collect();
                texts.join(" ")
            }
            "teleprompter" => {
                db.query_row(
                    "SELECT source_text FROM teleprompter_sessions WHERE id = ?1",
                    params![session_id],
                    |row| row.get(0),
                ).map_err(|e| e.to_string())?
            }
            _ => String::new(),
        }
    };

    let diff = stt::word_diff(&reference_text, &transcription);
    let duration_minutes = duration_ms as f64 / 60000.0;
    let word_count = transcription.split_whitespace().count() as f64;
    let reading_speed_wpm = if session_type == "teleprompter" && duration_minutes > 0.0 {
        Some(word_count / duration_minutes)
    } else {
        None
    };

    let now_str = now.to_rfc3339();
    let mispronounced_json = serde_json::to_string(&diff.mispronounced_words).unwrap_or_default();

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO recordings (session_type, session_id, audio_path, duration_ms, transcription, accuracy_score, missed_word_pct, mispronounced_words, reading_speed_wpm, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            session_type, session_id, audio_path_str, duration_ms,
            transcription, diff.accuracy_score, diff.missed_word_pct,
            mispronounced_json, reading_speed_wpm, now_str
        ],
    ).map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();

    Ok(Recording {
        id,
        session_type,
        session_id,
        audio_path: audio_path_str,
        duration_ms: Some(duration_ms),
        transcription: Some(transcription),
        accuracy_score: Some(diff.accuracy_score),
        missed_word_pct: Some(diff.missed_word_pct),
        mispronounced_words: Some(diff.mispronounced_words),
        reading_speed_wpm,
        created_at: now_str,
    })
}
