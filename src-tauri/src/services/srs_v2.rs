// Learning steps in minutes: 10m, 1day, 3days
const LEARNING_STEPS: &[i64] = &[10, 1440, 4320];
const GRADUATING_INTERVAL: f64 = 4.0;   // days on first Easy from new
const EASY_INTERVAL: f64 = 4.0;         // days when graduating via Easy

#[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize, Clone)]
pub struct SrsResult {
    pub new_state: String,        // "new" | "learning" | "review"
    pub new_step: i64,
    pub due_offset_minutes: i64,  // how many minutes from now until due
    pub new_interval_days: f64,
    pub new_ease_factor: f64,
}

pub fn calculate_next(
    state: &str,
    current_step: i64,
    rating: &str,
    interval_days: f64,
    ease_factor: f64,
) -> SrsResult {
    match state {
        "new" => new_card(rating, ease_factor),
        "learning" => learning_card(current_step, rating, ease_factor),
        "review" => review_card(interval_days, ease_factor, rating),
        _ => review_card(interval_days, ease_factor, rating),
    }
}

fn new_card(rating: &str, ease_factor: f64) -> SrsResult {
    match rating {
        "again" | "hard" => SrsResult {
            new_state: "learning".to_string(),
            new_step: 0,
            due_offset_minutes: LEARNING_STEPS[0],
            new_interval_days: 0.0,
            new_ease_factor: ease_factor,
        },
        "good" => SrsResult {
            new_state: "learning".to_string(),
            new_step: 1.min(LEARNING_STEPS.len() as i64 - 1),
            due_offset_minutes: LEARNING_STEPS[1.min(LEARNING_STEPS.len() - 1)],
            new_interval_days: 0.0,
            new_ease_factor: ease_factor,
        },
        "easy" => SrsResult {
            new_state: "review".to_string(),
            new_step: 0,
            due_offset_minutes: (EASY_INTERVAL * 1440.0) as i64,
            new_interval_days: EASY_INTERVAL,
            new_ease_factor: (ease_factor + 0.15).min(4.0),
        },
        _ => new_card("good", ease_factor),
    }
}

fn learning_card(current_step: i64, rating: &str, ease_factor: f64) -> SrsResult {
    let step = current_step as usize;
    match rating {
        "again" => SrsResult {
            new_state: "learning".to_string(),
            new_step: 0,
            due_offset_minutes: LEARNING_STEPS[0],
            new_interval_days: 0.0,
            new_ease_factor: ease_factor,
        },
        "hard" => {
            let prev = step.saturating_sub(1);
            SrsResult {
                new_state: "learning".to_string(),
                new_step: prev as i64,
                due_offset_minutes: LEARNING_STEPS[prev],
                new_interval_days: 0.0,
                new_ease_factor: (ease_factor - 0.15).max(1.3),
            }
        }
        "good" => {
            let next = step + 1;
            if next >= LEARNING_STEPS.len() {
                // Graduate to review
                SrsResult {
                    new_state: "review".to_string(),
                    new_step: 0,
                    due_offset_minutes: 1440, // 1 day
                    new_interval_days: 1.0,
                    new_ease_factor: ease_factor,
                }
            } else {
                SrsResult {
                    new_state: "learning".to_string(),
                    new_step: next as i64,
                    due_offset_minutes: LEARNING_STEPS[next],
                    new_interval_days: 0.0,
                    new_ease_factor: ease_factor,
                }
            }
        }
        "easy" => SrsResult {
            new_state: "review".to_string(),
            new_step: 0,
            due_offset_minutes: (GRADUATING_INTERVAL * 1440.0) as i64,
            new_interval_days: GRADUATING_INTERVAL,
            new_ease_factor: (ease_factor + 0.15).min(4.0),
        },
        _ => learning_card(current_step, "good", ease_factor),
    }
}

fn review_card(interval_days: f64, ease_factor: f64, rating: &str) -> SrsResult {
    match rating {
        "again" => SrsResult {
            new_state: "learning".to_string(),
            new_step: 0,
            due_offset_minutes: LEARNING_STEPS[0],
            new_interval_days: 0.0,
            new_ease_factor: (ease_factor - 0.20).max(1.3),
        },
        "hard" => {
            let new_interval = (interval_days * 1.2).max(1.0);
            SrsResult {
                new_state: "review".to_string(),
                new_step: 0,
                due_offset_minutes: (new_interval * 1440.0) as i64,
                new_interval_days: new_interval,
                new_ease_factor: (ease_factor - 0.15).max(1.3),
            }
        }
        "good" => {
            let new_interval = (interval_days * ease_factor).max(1.0);
            SrsResult {
                new_state: "review".to_string(),
                new_step: 0,
                due_offset_minutes: (new_interval * 1440.0) as i64,
                new_interval_days: new_interval,
                new_ease_factor: ease_factor,
            }
        }
        "easy" => {
            let new_interval = (interval_days * ease_factor * 1.3).max(1.0);
            SrsResult {
                new_state: "review".to_string(),
                new_step: 0,
                due_offset_minutes: (new_interval * 1440.0) as i64,
                new_interval_days: new_interval,
                new_ease_factor: (ease_factor + 0.15).min(4.0),
            }
        }
        _ => review_card(interval_days, ease_factor, "good"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_again_goes_to_learning_step0() {
        let r = calculate_next("new", 0, "again", 0.0, 2.5);
        assert_eq!(r.new_state, "learning");
        assert_eq!(r.new_step, 0);
        assert_eq!(r.due_offset_minutes, 10);
    }

    #[test]
    fn test_new_good_goes_to_learning_step1() {
        let r = calculate_next("new", 0, "good", 0.0, 2.5);
        assert_eq!(r.new_state, "learning");
        assert_eq!(r.new_step, 1);
        assert_eq!(r.due_offset_minutes, 1440);
    }

    #[test]
    fn test_new_easy_graduates_to_review() {
        let r = calculate_next("new", 0, "easy", 0.0, 2.5);
        assert_eq!(r.new_state, "review");
        assert!(r.new_interval_days > 0.0);
    }

    #[test]
    fn test_learning_good_final_step_graduates() {
        // At last learning step, Good should graduate
        let last_step = (LEARNING_STEPS.len() - 1) as i64;
        let r = calculate_next("learning", last_step, "good", 0.0, 2.5);
        assert_eq!(r.new_state, "review");
    }

    #[test]
    fn test_learning_again_resets_to_step0() {
        let r = calculate_next("learning", 2, "again", 0.0, 2.5);
        assert_eq!(r.new_state, "learning");
        assert_eq!(r.new_step, 0);
    }

    #[test]
    fn test_review_again_returns_to_learning() {
        let r = calculate_next("review", 0, "again", 10.0, 2.5);
        assert_eq!(r.new_state, "learning");
        assert_eq!(r.new_step, 0);
    }

    #[test]
    fn test_review_good_increases_interval() {
        let r = calculate_next("review", 0, "good", 10.0, 2.5);
        assert_eq!(r.new_state, "review");
        assert!(r.new_interval_days > 10.0);
    }

    #[test]
    fn test_ease_floor_at_1_3() {
        let r = calculate_next("review", 0, "again", 5.0, 1.3);
        assert!(r.new_ease_factor >= 1.3);
    }
}
