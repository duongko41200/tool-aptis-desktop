mod commands;
mod services;
mod db;

use std::sync::{Arc, Mutex};
use std::sync::atomic::AtomicBool;
use std::path::PathBuf;
use rusqlite::Connection;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub app_data_dir: PathBuf,
    pub clipboard_monitoring_enabled: Arc<AtomicBool>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:aptis.db", vec![
                tauri_plugin_sql::Migration {
                    version: 1,
                    description: "initial_schema",
                    sql: include_str!("../migrations/001_initial_schema.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                }
            ])
            .build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir)?;

            let db_path = app_data_dir.join("aptis.db");
            let conn = db::pool::open_connection(&db_path)
                .expect("failed to open database");
            db::pool::run_migrations(&conn)
                .expect("failed to run migrations");

            let clipboard_flag = Arc::new(AtomicBool::new(false));

            let state = AppState {
                db: Mutex::new(conn),
                app_data_dir,
                clipboard_monitoring_enabled: clipboard_flag.clone(),
            };
            app.manage(state);

            let app_handle = app.handle().clone();
            services::clipboard_watcher::start_watcher(app_handle, clipboard_flag);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_settings,
            commands::get_settings,
            commands::speaking::create_video_session,
            commands::speaking::import_subtitles,
            commands::speaking::update_subtitle_entry,
            commands::speaking::get_subtitles_for_session,
            commands::speaking::create_teleprompter_session,
            commands::speaking::update_teleprompter_session,
            commands::speaking::save_recording,
            commands::writing::evaluate_writing,
            commands::writing::get_writing_submissions,
            commands::vocabulary::add_vocabulary_entry,
            commands::vocabulary::get_due_cards,
            commands::vocabulary::get_vocabulary_list,
            commands::vocabulary::start_review_session,
            commands::vocabulary::end_review_session,
            commands::vocabulary::submit_review_rating,
            commands::clipboard::save_captured_content,
            commands::clipboard::search_captured_content,
            commands::clipboard::process_content_with_ai,
            commands::clipboard::toggle_clipboard_monitoring,
            commands::clipboard::get_clipboard_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
