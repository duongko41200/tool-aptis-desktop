use std::collections::BTreeSet;

#[derive(Debug, PartialEq, Clone, serde::Serialize)]
pub struct ClozeCard {
    pub cloze_index: u32,
    pub card_type: String,  // "cloze_1", "cloze_2", ...
    pub front_rendered: String, // text with [...] for this index
}

/// Parse `{{cN::answer}}` patterns and return one ClozeCard per unique N.
pub fn parse_cloze(text: &str) -> Result<Vec<ClozeCard>, String> {
    let re = regex_lite::Regex::new(r"\{\{c(\d+)::([^}]+)\}\}").unwrap();

    // Collect unique cloze indices in order
    let indices: BTreeSet<u32> = re.captures_iter(text)
        .filter_map(|cap| cap.get(1).and_then(|m| m.as_str().parse::<u32>().ok()))
        .collect();

    if indices.is_empty() {
        return Err("No cloze deletions found. Use {{c1::answer}} syntax.".to_string());
    }

    let cards = indices.into_iter().map(|idx| {
        let front = render_cloze_for_card(text, idx);
        ClozeCard {
            cloze_index: idx,
            card_type: format!("cloze_{}", idx),
            front_rendered: front,
        }
    }).collect();

    Ok(cards)
}

/// For card with `target_index`, replace that cloze with `[...]`,
/// and replace all other clozes with their answer text.
pub fn render_cloze_for_card(text: &str, target_index: u32) -> String {
    let re = regex_lite::Regex::new(r"\{\{c(\d+)::([^}]+)\}\}").unwrap();
    re.replace_all(text, |caps: &regex_lite::Captures| {
        let idx: u32 = caps[1].parse().unwrap_or(0);
        let answer = &caps[2];
        if idx == target_index {
            "[...]".to_string()
        } else {
            answer.to_string()
        }
    }).to_string()
}

/// Strip all cloze markup, returning plain text (for the back of a cloze card).
pub fn strip_cloze(text: &str) -> String {
    let re = regex_lite::Regex::new(r"\{\{c\d+::([^}]+)\}\}").unwrap();
    re.replace_all(text, |caps: &regex_lite::Captures| caps[1].to_string()).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_cloze() {
        let cards = parse_cloze("Tokyo is the {{c1::capital}} of Japan").unwrap();
        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].card_type, "cloze_1");
        assert_eq!(cards[0].front_rendered, "Tokyo is the [...] of Japan");
    }

    #[test]
    fn test_multiple_cloze() {
        let cards = parse_cloze("{{c1::Tokyo}} is the capital of {{c2::Japan}}").unwrap();
        assert_eq!(cards.len(), 2);
        assert_eq!(cards[0].front_rendered, "[...] is the capital of Japan");
        assert_eq!(cards[1].front_rendered, "Tokyo is the capital of [...]");
    }

    #[test]
    fn test_no_cloze_returns_error() {
        assert!(parse_cloze("No cloze here").is_err());
    }

    #[test]
    fn test_strip_cloze() {
        let result = strip_cloze("{{c1::Tokyo}} is the {{c2::capital}}");
        assert_eq!(result, "Tokyo is the capital");
    }

    #[test]
    fn test_render_for_specific_card() {
        let text = "{{c1::A}} and {{c2::B}}";
        assert_eq!(render_cloze_for_card(text, 1), "[...] and B");
        assert_eq!(render_cloze_for_card(text, 2), "A and [...]");
    }
}
