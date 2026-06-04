use std::net::TcpStream;
use std::path::PathBuf;
use std::time::Duration;

const PORT: u16 = 8080;

#[derive(serde::Serialize)]
pub struct BackendDiagnostics {
    pub port_open: bool,
    pub backend_dir: Option<String>,
    pub log: String,
    pub pid_on_port: Option<u32>,
}

fn pid_listening_on_port() -> Option<u32> {
    // netstat -ano để tìm PID đang LISTEN trên PORT
    let out = std::process::Command::new("netstat")
        .args(["-ano"])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    for line in text.lines() {
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() >= 5
            && cols[3] == "LISTENING"
            && cols[1].ends_with(&format!(":{PORT}"))
        {
            return cols[4].parse().ok();
        }
    }
    None
}

fn backend_dir() -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    {
        let p = PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../backend"));
        if p.join("main.py").exists() {
            return Some(p);
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        let p = cwd.join("backend");
        if p.join("main.py").exists() {
            return Some(p);
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let p = parent.join("backend");
            if p.join("main.py").exists() {
                return Some(p);
            }
        }
    }
    None
}

fn port_open() -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{PORT}").parse().unwrap(),
        Duration::from_millis(600),
    )
    .is_ok()
}

#[tauri::command]
pub async fn check_backend_running() -> bool {
    port_open()
}

#[tauri::command]
pub async fn get_backend_diagnostics() -> BackendDiagnostics {
    let dir = backend_dir();
    let log = dir.as_ref()
        .map(|d| {
            std::fs::read_to_string(d.join("uvicorn_stderr.log"))
                .unwrap_or_else(|_| "(chưa có log)".to_string())
        })
        .unwrap_or_else(|| "(không tìm thấy thư mục backend)".to_string());

    BackendDiagnostics {
        port_open: port_open(),
        backend_dir: dir.map(|d| d.display().to_string()),
        log,
        pid_on_port: pid_listening_on_port(),
    }
}

/// Spawn uvicorn nếu chưa chạy — trả về ngay, không đợi.
/// Frontend tự poll /models/status cho đến khi ready.
#[tauri::command]
pub async fn start_rag_backend() -> Result<String, String> {
    if port_open() {
        return Ok("already_running".to_string());
    }

    let dir = backend_dir().ok_or_else(|| {
        format!(
            "Không tìm thấy backend/main.py (CARGO_MANIFEST_DIR={}, cwd={})",
            env!("CARGO_MANIFEST_DIR"),
            std::env::current_dir()
                .map(|p| p.display().to_string())
                .unwrap_or_default(),
        )
    })?;

    // Ghi stderr vào log để debug
    let log_path = dir.join("uvicorn_stderr.log");
    let stderr_file = std::fs::File::create(&log_path)
        .unwrap_or_else(|_| std::fs::File::open("NUL").unwrap());

    let candidates: &[(&str, &[&str])] = &[
        ("python",  &["-m", "uvicorn", "main:app", "--port", "8080"]),
        ("python3", &["-m", "uvicorn", "main:app", "--port", "8080"]),
        ("uvicorn", &["main:app", "--port", "8080"]),
    ];

    let mut last_err = String::from("python/python3/uvicorn không có trong PATH");

    for (prog, args) in candidates {
        let stderr = stderr_file.try_clone().unwrap_or_else(|_| {
            std::fs::File::open("NUL").unwrap()
        });
        match std::process::Command::new(prog)
            .args(*args)
            .current_dir(&dir)
            .stdout(std::process::Stdio::null())
            .stderr(stderr)
            .spawn()
        {
            Ok(_) => return Ok(format!("spawned:{prog}")),
            Err(e) => last_err = format!("{prog}: {e}"),
        }
    }

    Err(last_err)
}
