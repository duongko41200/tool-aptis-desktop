mod commands;
mod services;
mod db;

use std::sync::{Arc, Mutex};
use std::sync::atomic::AtomicBool;
use std::path::PathBuf;
use rusqlite::Connection;
use tauri::{Manager, Emitter};
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItemBuilder};

pub struct AppState {
    pub db: Mutex<Connection>,
    pub app_data_dir: PathBuf,
    pub clipboard_monitoring_enabled: Arc<AtomicBool>,
}

#[derive(Clone, serde::Serialize)]
struct ClipboardChangedPayload {
    content: String,
    char_count: usize,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:aptis.db", vec![
                tauri_plugin_sql::Migration {
                    version: 1,
                    description: "initial_schema",
                    sql: include_str!("../migrations/001_initial_schema.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                tauri_plugin_sql::Migration {
                    version: 2,
                    description: "anki_schema",
                    sql: include_str!("../migrations/002_anki_schema.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
            ])
            .build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                if window.label() == "main" {
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .setup(|app| {
            // Setup Tray Menu
            let quit_i = MenuItemBuilder::with_id("quit", "Thoát hoàn toàn").build(app)?;
            let show_i = MenuItemBuilder::with_id("show", "Mở ứng dụng Aptis").build(app)?;
            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&show_i)
                .separator()
                .item(&quit_i)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Aptis English Learning")
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                })
                .build(app)?;

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

            // Create hidden clipboard popup window at startup
            tauri::WebviewWindowBuilder::new(
                app,
                "clipboard-popup",
                tauri::WebviewUrl::App("/popup".into()),
            )
            .always_on_top(true)
            .decorations(false)
            .skip_taskbar(true)
            .visible(false)
            .inner_size(380.0, 440.0)
            .resizable(false)
            .transparent(true)
            .build()?;

            // Register Ctrl+K global shortcut
            let app_handle_shortcut = app.handle().clone();
            use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
            let _ = app.handle().global_shortcut().on_shortcut("Ctrl+K", move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let handle = app_handle_shortcut.clone();
                    std::thread::spawn(move || {
                        // Simulate Ctrl+C to copy selected text
                        simulate_copy();
                        std::thread::sleep(std::time::Duration::from_millis(200));

                        // Read clipboard
                        if let Ok(mut cb) = arboard::Clipboard::new() {
                            if let Ok(text) = cb.get_text() {
                                if !text.is_empty() {
                                    // 1. Emit content to popup window first
                                    let _ = handle.emit("clipboard:changed", ClipboardChangedPayload {
                                        char_count: text.len(),
                                        content: text,
                                    });
                                    // 2. Wait a tick for React to process the event
                                    std::thread::sleep(std::time::Duration::from_millis(50));
                                    // 3. Show the popup window from Rust (reliable)
                                    if let Some(window) = handle.get_webview_window("clipboard-popup") {
                                        use tauri_plugin_positioner::{WindowExt, Position};
                                        let _ = window.move_window(Position::Center);
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                }
                            }
                        }
                    });
                }
            });

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
            commands::writing::save_writing_score,
            commands::writing::get_writing_scores_by_exam,
            commands::writing::delete_writing_score,
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
            commands::clipboard::show_clipboard_popup,
            commands::clipboard::hide_clipboard_popup,
            commands::anki::get_decks,
            commands::anki::create_deck,
            commands::anki::delete_deck,
            commands::anki::create_note,
            commands::anki::update_note,
            commands::anki::delete_note,
            commands::anki::get_notes_for_deck,
            commands::anki::get_due_cards_for_deck,
            commands::anki::submit_card_rating,
            commands::anki::bury_card,
            commands::anki::suspend_card,
            commands::anki::flag_card,
            commands::anki::create_note_from_clipboard,
            commands::anki::save_deck_session,
            commands::anki::get_deck_session,
            commands::backend::start_rag_backend,
            commands::backend::check_backend_running,
            commands::backend::get_backend_diagnostics,
            commands::pdf::export_pdf_headless,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn simulate_copy() {
    use enigo::{Enigo, Key, Keyboard, Settings, Direction};
    if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
        let _ = enigo.key(Key::Control, Direction::Press);
        let _ = enigo.key(Key::Unicode('c'), Direction::Click);
        let _ = enigo.key(Key::Control, Direction::Release);
    }
}
