use base64::{Engine as _, engine::general_purpose};
use crate::services::gemini::GeminiClient;

pub async fn transcribe_audio(
    audio_bytes: Vec<u8>,
    api_key: String,
) -> Result<String, String> {
    let audio_base64 = general_purpose::STANDARD.encode(&audio_bytes);
    let client = GeminiClient::new(api_key);
    client.transcribe_audio(&audio_base64, "audio/webm").await
}

pub fn word_diff(reference: &str, transcription: &str) -> DiffResult {
    let ref_words: Vec<&str> = reference.split_whitespace().collect();
    let trans_words: Vec<&str> = transcription.split_whitespace().collect();

    let mut correct = 0usize;
    let mut missed = 0usize;
    let mut mispronounced: Vec<String> = Vec::new();
    let mut word_results: Vec<WordResult> = Vec::new();

    for (i, ref_word) in ref_words.iter().enumerate() {
        let ref_clean = ref_word.to_lowercase().trim_matches(|c: char| !c.is_alphabetic()).to_string();
        if let Some(trans_word) = trans_words.get(i) {
            let trans_clean = trans_word.to_lowercase().trim_matches(|c: char| !c.is_alphabetic()).to_string();
            if ref_clean == trans_clean {
                correct += 1;
                word_results.push(WordResult { word: ref_word.to_string(), status: "correct".to_string() });
            } else {
                mispronounced.push(ref_word.to_string());
                word_results.push(WordResult { word: ref_word.to_string(), status: "mispronounced".to_string() });
            }
        } else {
            missed += 1;
            word_results.push(WordResult { word: ref_word.to_string(), status: "missed".to_string() });
        }
    }

    let total = ref_words.len();
    let accuracy_score = if total > 0 {
        (correct as f64 / total as f64) * 100.0
    } else {
        100.0
    };
    let missed_word_pct = if total > 0 {
        (missed as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    DiffResult {
        accuracy_score,
        missed_word_pct,
        mispronounced_words: mispronounced,
        word_results,
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct DiffResult {
    pub accuracy_score: f64,
    pub missed_word_pct: f64,
    pub mispronounced_words: Vec<String>,
    pub word_results: Vec<WordResult>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct WordResult {
    pub word: String,
    pub status: String, // "correct", "mispronounced", "missed"
}
