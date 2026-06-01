use reqwest::Client;
use serde_json::{json, Value};

const GEMINI_API_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

pub struct GeminiClient {
    client: Client,
    api_key: String,
}

impl GeminiClient {
    pub fn new(api_key: String) -> Self {
        Self { client: Client::new(), api_key }
    }

    pub async fn generate_content(
        &self,
        system_prompt: &str,
        user_message: &str,
    ) -> Result<String, String> {
        let url = format!("{}?key={}", GEMINI_API_BASE, self.api_key);
        let body = json!({
            "system_instruction": {
                "parts": [{ "text": system_prompt }]
            },
            "contents": [{
                "parts": [{ "text": user_message }]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        });

        let resp = self.client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Gemini API error {}: {}", status, text));
        }

        let json: Value = resp.json().await.map_err(|e| e.to_string())?;
        let text = json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or("No text in response")?
            .to_string();
        Ok(text)
    }

    pub async fn transcribe_audio(
        &self,
        audio_base64: &str,
        mime_type: &str,
    ) -> Result<String, String> {
        let url = format!("{}?key={}", GEMINI_API_BASE, self.api_key);
        let body = json!({
            "contents": [{
                "parts": [
                    { "text": "Transcribe this audio accurately. Return only the transcription text, nothing else." },
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": audio_base64
                        }
                    }
                ]
            }]
        });

        let resp = self.client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Gemini STT error {}: {}", status, text));
        }

        let json: Value = resp.json().await.map_err(|e| e.to_string())?;
        let text = json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or("No transcription in response")?
            .to_string();
        Ok(text)
    }
}
