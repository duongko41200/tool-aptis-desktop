pub mod speaking;
pub mod writing;
pub mod vocabulary;
pub mod clipboard;
pub mod anki;
pub mod ollama;
pub mod backend;
pub mod pdf;

use serde::{Deserialize, Serialize};
use tauri::State;
use tauri_plugin_store::StoreExt;
use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSettings {
    pub gemini_api_key: Option<String>,
    pub clipboard_monitoring_enabled: bool,
    pub tts_voice: String,
    pub default_writing_mode: String,
}

#[tauri::command]
pub async fn save_settings(
    settings: serde_json::Value,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    if let Some(key) = settings.get("gemini_api_key").and_then(|v| v.as_str()) {
        if !key.is_empty() {
            let store = app.store("settings.json").map_err(|e| e.to_string())?;
            store.set("gemini_api_key", key);
            store.save().map_err(|e| e.to_string())?;
        }
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let fields = ["clipboard_monitoring_enabled", "tts_voice", "default_writing_mode"];
    for field in fields {
        if let Some(val) = settings.get(field) {
            let val_str = match val {
                serde_json::Value::Bool(b) => if *b { "true" } else { "false" }.to_string(),
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            db.execute(
                "INSERT OR REPLACE INTO settings(key, value) VALUES (?1, ?2)",
                rusqlite::params![field, val_str],
            ).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn get_settings(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<AppSettings, String> {
    let api_key = {
        if let Ok(store) = app.store("settings.json") {
            store.get("gemini_api_key")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
        } else {
            None
        }
    };
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let get_setting = |key: &str| -> Option<String> {
        db.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            rusqlite::params![key],
            |row| row.get(0),
        ).ok()
    };
    Ok(AppSettings {
        gemini_api_key: api_key,
        clipboard_monitoring_enabled: get_setting("clipboard_monitoring_enabled")
            .map(|v| v == "true").unwrap_or(false),
        tts_voice: get_setting("tts_voice").unwrap_or_default(),
        default_writing_mode: get_setting("default_writing_mode").unwrap_or_else(|| "general".to_string()),
    })
}

pub fn get_api_key(app: &tauri::AppHandle) -> Result<String, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.get("gemini_api_key")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| "Gemini API key not configured. Please add it in Settings.".to_string())
}
