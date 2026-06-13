use tauri::State;
use serde::{Deserialize, Serialize};
use rusqlite::params;
use crate::AppState;
use crate::services::gemini::GeminiClient;
use super::get_api_key;

#[derive(Debug, Serialize, Deserialize)]
pub struct WritingEvaluationResult {
    pub id: i64,
    pub overall_score: f64,
    pub grammar_score: f64,
    pub vocabulary_score: f64,
    pub coherence_score: f64,
    pub suggestions: Vec<String>,
    pub grammar_corrections: Vec<Correction>,
    pub better_sentences: Vec<BetterSentence>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Correction {
    pub original: String,
    pub corrected: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BetterSentence {
    pub original: String,
    pub improved: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WritingSubmission {
    pub id: i64,
    pub content: String,
    pub evaluation_mode: String,
    pub overall_score: Option<f64>,
    pub grammar_score: Option<f64>,
    pub vocabulary_score: Option<f64>,
    pub coherence_score: Option<f64>,
    pub suggestions: Option<Vec<String>>,
    pub grammar_corrections: Option<Vec<Correction>>,
    pub better_sentences: Option<Vec<BetterSentence>>,
    pub word_count: Option<i64>,
    pub created_at: String,
}

fn get_system_prompt(mode: &str) -> String {
    let mode_context = match mode {
        "ielts" => "This is an IELTS Writing task. Score on a 0-9 band scale.",
        "toeic" => "This is a TOEIC Writing task. Score on a 0-100 scale.",
        "aptis" => "This is an Aptis Writing task. Score on a 0-50 scale.",
        _ => "Evaluate general English writing quality. Score on a 0-100 scale.",
    };
    format!(
        r#"You are an expert English language examiner. {mode_context}

Evaluate the following writing passage and return a JSON object with exactly this structure:
{{
  "overall_score": <number>,
  "grammar_score": <number>,
  "vocabulary_score": <number>,
  "coherence_score": <number>,
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "grammar_corrections": [
    {{"original": "incorrect sentence", "corrected": "corrected sentence"}},
    ...
  ],
  "better_sentences": [
    {{"original": "original sentence", "improved": "improved version"}},
    ...
  ]
}}

Provide at least 2 suggestions, 2 grammar corrections (if applicable), and 2 better sentence alternatives."#,
        mode_context = mode_context
    )
}

#[tauri::command]
pub async fn evaluate_writing(
    content: String,
    mode: String,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<WritingEvaluationResult, String> {
    let api_key = get_api_key(&app)?;

    let word_count = content.split_whitespace().count() as i64;
    let system_prompt = get_system_prompt(&mode);
    let client = GeminiClient::new(api_key);
    let response = client.generate_content(&system_prompt, &content).await?;

    let result_json: serde_json::Value = serde_json::from_str(&response)
        .map_err(|_| format!("Failed to parse AI response: {}", &response[..200.min(response.len())]))?;

    let overall_score = result_json["overall_score"].as_f64().unwrap_or(0.0);
    let grammar_score = result_json["grammar_score"].as_f64().unwrap_or(0.0);
    let vocabulary_score = result_json["vocabulary_score"].as_f64().unwrap_or(0.0);
    let coherence_score = result_json["coherence_score"].as_f64().unwrap_or(0.0);

    let suggestions: Vec<String> = result_json["suggestions"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    let grammar_corrections: Vec<Correction> = result_json["grammar_corrections"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| {
            Some(Correction {
                original: v["original"].as_str()?.to_string(),
                corrected: v["corrected"].as_str()?.to_string(),
            })
        }).collect())
        .unwrap_or_default();

    let better_sentences: Vec<BetterSentence> = result_json["better_sentences"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| {
            Some(BetterSentence {
                original: v["original"].as_str()?.to_string(),
                improved: v["improved"].as_str()?.to_string(),
            })
        }).collect())
        .unwrap_or_default();

    let now = chrono::Utc::now().to_rfc3339();
    let suggestions_json = serde_json::to_string(&suggestions).unwrap_or_default();
    let corrections_json = serde_json::to_string(&grammar_corrections).unwrap_or_default();
    let better_json = serde_json::to_string(&better_sentences).unwrap_or_default();

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO writing_submissions (content, evaluation_mode, overall_score, grammar_score, vocabulary_score, coherence_score, suggestions, grammar_corrections, better_sentences, ai_raw_response, word_count, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            content, mode, overall_score, grammar_score, vocabulary_score, coherence_score,
            suggestions_json, corrections_json, better_json, response, word_count, now
        ],
    ).map_err(|e| e.to_string())?;
    let id = db.last_insert_rowid();

    Ok(WritingEvaluationResult {
        id,
        overall_score,
        grammar_score,
        vocabulary_score,
        coherence_score,
        suggestions,
        grammar_corrections,
        better_sentences,
    })
}

#[tauri::command]
pub async fn get_writing_submissions(
    state: State<'_, AppState>,
) -> Result<Vec<WritingSubmission>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, content, evaluation_mode, overall_score, grammar_score, vocabulary_score, coherence_score, suggestions, grammar_corrections, better_sentences, word_count, created_at
         FROM writing_submissions ORDER BY created_at DESC LIMIT 50"
    ).map_err(|e| e.to_string())?;

    let submissions = stmt.query_map([], |row| {
        let suggestions_json: Option<String> = row.get(7)?;
        let corrections_json: Option<String> = row.get(8)?;
        let better_json: Option<String> = row.get(9)?;
        Ok(WritingSubmission {
            id: row.get(0)?,
            content: row.get(1)?,
            evaluation_mode: row.get(2)?,
            overall_score: row.get(3)?,
            grammar_score: row.get(4)?,
            vocabulary_score: row.get(5)?,
            coherence_score: row.get(6)?,
            suggestions: suggestions_json.as_deref().and_then(|s| serde_json::from_str(s).ok()),
            grammar_corrections: corrections_json.as_deref().and_then(|s| serde_json::from_str(s).ok()),
            better_sentences: better_json.as_deref().and_then(|s| serde_json::from_str(s).ok()),
            word_count: row.get(10)?,
            created_at: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(submissions)
}

// ── Writing Score History (APTIS Part 4 scorer) ──────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct WritingScoreHistoryEntry {
    pub id: String,
    pub exam_id: String,
    pub exam_title: String,
    pub letter_type: String,
    pub essay: String,
    pub result_json: String,
    pub cross_exam_results_json: Option<String>,
    pub word_count: i64,
    pub saved_at: String,
}

#[tauri::command]
pub async fn save_writing_score(
    id: String,
    exam_id: String,
    exam_title: String,
    letter_type: String,
    essay: String,
    result_json: String,
    cross_exam_results_json: Option<String>,
    word_count: i64,
    saved_at: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO writing_score_history
         (id, exam_id, exam_title, letter_type, essay, result_json, cross_exam_results_json, word_count, saved_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, exam_id, exam_title, letter_type, essay, result_json, cross_exam_results_json, word_count, saved_at],
    ).map_err(|e| format!("DB insert failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_writing_scores_by_exam(
    exam_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<WritingScoreHistoryEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, exam_id, exam_title, letter_type, essay, result_json, cross_exam_results_json, word_count, saved_at
         FROM writing_score_history WHERE exam_id = ?1 ORDER BY saved_at DESC LIMIT 100",
    ).map_err(|e| e.to_string())?;

    let entries = stmt.query_map(params![exam_id], |row| {
        Ok(WritingScoreHistoryEntry {
            id: row.get(0)?,
            exam_id: row.get(1)?,
            exam_title: row.get(2)?,
            letter_type: row.get(3)?,
            essay: row.get(4)?,
            result_json: row.get(5)?,
            cross_exam_results_json: row.get(6)?,
            word_count: row.get(7)?,
            saved_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(entries)
}

#[tauri::command]
pub async fn delete_writing_score(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM writing_score_history WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
