use std::path::PathBuf;
use std::fs;

fn find_browser() -> Option<PathBuf> {
    // Microsoft Edge (always present on Windows 10/11)
    let edge_candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ];
    for p in &edge_candidates {
        let pb = PathBuf::from(p);
        if pb.exists() { return Some(pb); }
    }
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        let edge = PathBuf::from(&local).join(r"Microsoft\Edge\Application\msedge.exe");
        if edge.exists() { return Some(edge); }
    }

    // Google Chrome fallback
    let chrome_candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ];
    for p in &chrome_candidates {
        let pb = PathBuf::from(p);
        if pb.exists() { return Some(pb); }
    }
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        let chrome = PathBuf::from(&local).join(r"Google\Chrome\Application\chrome.exe");
        if chrome.exists() { return Some(chrome); }
    }

    None
}

#[tauri::command]
pub async fn export_pdf_headless(
    html: String,
    filename: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let browser = find_browser()
        .ok_or_else(|| "Không tìm thấy Microsoft Edge hoặc Chrome. Vui lòng cài đặt trình duyệt.".to_string())?;

    // Write HTML to a temp file
    let temp_dir = std::env::temp_dir();
    let html_path = temp_dir.join("aptis_print_input.html");
    fs::write(&html_path, html.as_bytes()).map_err(|e| format!("Không thể ghi file tạm: {e}"))?;

    // Determine output directory (Desktop → Documents → temp)
    let output_dir: PathBuf = {
        let home = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .map(PathBuf::from)
            .unwrap_or_else(|_| temp_dir.clone());
        let desktop = home.join("Desktop");
        if desktop.exists() { desktop } else { home.join("Documents") }
    };
    let _ = fs::create_dir_all(&output_dir);

    // Sanitise filename
    let safe: String = filename.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '_' })
        .collect();
    let safe = safe.trim().to_string();
    let safe = if safe.is_empty() { "APTIS_Writing".to_string() } else { safe };
    let pdf_path = output_dir.join(format!("{}.pdf", safe));

    // Build file URL for the HTML
    let html_url = format!(
        "file:///{}",
        html_path.to_string_lossy().replace('\\', "/")
    );
    let pdf_out_arg = format!("--print-to-pdf={}", pdf_path.to_string_lossy());

    let output = std::process::Command::new(&browser)
        .args([
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--run-all-compositor-stages-before-draw",
            "--print-to-pdf-no-header",
            "--virtual-time-budget=8000",
            &pdf_out_arg,
            &html_url,
        ])
        .output()
        .map_err(|e| format!("Không thể chạy trình duyệt: {e}"))?;

    let _ = fs::remove_file(&html_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Trình duyệt báo lỗi: {stderr}"));
    }

    if !pdf_path.exists() {
        return Err("Không thể tạo file PDF. Vui lòng thử lại.".to_string());
    }

    // Open the saved PDF with the default viewer
    use tauri_plugin_opener::OpenerExt;
    let _ = app.opener().open_path(pdf_path.to_string_lossy().as_ref(), Option::<&str>::None);

    Ok(pdf_path.to_string_lossy().to_string())
}
