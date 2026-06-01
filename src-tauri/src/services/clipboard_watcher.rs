use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
struct ClipboardChangedPayload {
    content: String,
    char_count: usize,
}

pub fn start_watcher(app: AppHandle, enabled_flag: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut last_text = String::new();
        loop {
            std::thread::sleep(Duration::from_millis(500));
            if !enabled_flag.load(Ordering::Relaxed) {
                continue;
            }
            if let Ok(mut clipboard) = arboard::Clipboard::new() {
                if let Ok(text) = clipboard.get_text() {
                    if text.len() >= 10 && text != last_text {
                        last_text = text.clone();
                        let _ = app.emit("clipboard:changed", ClipboardChangedPayload {
                            char_count: text.len(),
                            content: text,
                        });
                    }
                }
            }
        }
    });
}
