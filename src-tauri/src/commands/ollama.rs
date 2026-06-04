use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::process::Stdio;
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct OllamaProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percent: u8,
    pub done: bool,
    pub message: String,
    pub error: Option<String>,
}

fn emit(app: &AppHandle, percent: u8, message: &str, done: bool, error: Option<String>) {
    let _ = app.emit("ollama:progress", OllamaProgress {
        downloaded: 0, total: 0, percent, done,
        message: message.to_string(), error,
    });
}

// Các exit code winget có nghĩa là "đã cài" hoặc "không cần cập nhật" — đều là success
/// Kiểm tra Ollama có đang lắng nghe trên port 11434 không (không cần Python backend)
#[tauri::command]
pub async fn check_ollama_running() -> bool {
    use std::net::TcpStream;
    use std::time::Duration;
    TcpStream::connect_timeout(
        &"127.0.0.1:11434".parse().unwrap(),
        Duration::from_secs(2),
    ).is_ok()
}

/// Khởi động Ollama serve trong background
#[tauri::command]
pub async fn start_ollama() -> Result<(), String> {
    use std::process::Stdio;
    std::process::Command::new("ollama")
        .arg("serve")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Không tìm thấy lệnh ollama: {e}"))?;
    Ok(())
}

fn is_winget_success(code: i32) -> bool {
    matches!(code,
        0               |   // Clean install
        -1978335189     |   // 0x8A15002B: No applicable update found (already installed)
        -1978335215     |   // 0x8A150011: Package already installed
        -1978335207     |   // 0x8A150019: No updates available
        -1978334960         // 0x8A150110: Already installed, same version
    )
}

#[tauri::command]
pub async fn download_ollama(app: AppHandle) -> Result<(), String> {
    if std::process::Command::new("winget").arg("--version").output().is_err() {
        return Err("winget không có sẵn. Vui lòng cập nhật Windows 10/11.".to_string());
    }

    emit(&app, 5, "Đang khởi động winget...", false, None);

    let app_clone = app.clone();
    tokio::task::spawn_blocking(move || {
        let mut child = std::process::Command::new("winget")
            .args([
                "install", "Ollama.Ollama",
                "--accept-package-agreements",
                "--accept-source-agreements",
                "--disable-interactivity",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Không chạy được winget: {e}"))?;

        // Đọc stdout trong thread riêng
        let app_out = app_clone.clone();
        let stdout_thread = child.stdout.take().map(|stdout| {
            thread::spawn(move || {
                for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                    let line = line.trim().to_string();
                    if line.is_empty() { continue; }
                    let percent = if line.contains("Downloading") { 30 }
                        else if line.contains("Installing")        { 70 }
                        else if line.to_lowercase().contains("successfully") { 95 }
                        else { 50 };
                    emit(&app_out, percent, &line, false, None);
                }
            })
        });

        // Đọc stderr — winget hay báo lỗi qua đây
        let app_err = app_clone.clone();
        let stderr_acc = std::sync::Arc::new(std::sync::Mutex::new(Vec::<String>::new()));
        let stderr_acc2 = stderr_acc.clone();
        let stderr_thread = child.stderr.take().map(|stderr| {
            thread::spawn(move || {
                for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                    let line = line.trim().to_string();
                    if line.is_empty() { continue; }
                    emit(&app_err, 50, &line, false, None);
                    stderr_acc2.lock().unwrap().push(line);
                }
            })
        });

        let status = child.wait().map_err(|e| e.to_string())?;
        if let Some(h) = stdout_thread { let _ = h.join(); }
        if let Some(h) = stderr_thread { let _ = h.join(); }

        let code = status.code().unwrap_or(-1);

        if is_winget_success(code) {
            let msg = if code == 0 {
                "Ollama đã cài xong!"
            } else {
                "Ollama đã được cài sẵn trên máy rồi!"
            };
            emit(&app_clone, 100, msg, true, None);
        } else {
            // Với các lỗi không rõ: vẫn báo done=true nhưng kèm cảnh báo
            // để frontend chuyển sang install_done và cho user "Kiểm tra lại"
            let stderr_text = stderr_acc.lock().unwrap().join(" | ");
            let detail = if stderr_text.is_empty() {
                format!("exit code {code:#010X} ({code})")
            } else {
                stderr_text
            };
            // done=true để frontend không kẹt — user sẽ tự kiểm tra
            emit(&app_clone, 100, &format!("winget kết thúc: {detail}"), true, None);
        }

        Ok::<(), String>(())
    }).await.map_err(|e| e.to_string())?.map_err(|e| e)?;

    Ok(())
}
