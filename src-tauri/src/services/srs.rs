// SM-2 spaced repetition algorithm
pub fn calculate_next_interval(
    interval_days: f64,
    ease_factor: f64,
    rating: &str,
) -> (f64, f64) {
    let mut new_ease = ease_factor;
    let new_interval = match rating {
        "again" => {
            new_ease = (ease_factor - 0.20).max(1.3);
            0.0
        }
        "hard" => {
            new_ease = (ease_factor - 0.15).max(1.3);
            if interval_days <= 0.0 { 1.0 } else { interval_days * 1.2 }
        }
        "good" => {
            if interval_days <= 0.0 { 1.0 } else { interval_days * ease_factor }
        }
        "easy" => {
            new_ease = (ease_factor + 0.15).min(4.0);
            if interval_days <= 0.0 { 3.0 } else { interval_days * ease_factor * 1.3 }
        }
        _ => interval_days,
    };
    (new_interval.max(0.0), new_ease.max(1.3))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_again_resets_interval() {
        let (interval, ease) = calculate_next_interval(10.0, 2.5, "again");
        assert_eq!(interval, 0.0);
        assert!(ease < 2.5);
    }

    #[test]
    fn test_easy_increases_ease() {
        let (interval, ease) = calculate_next_interval(5.0, 2.5, "easy");
        assert!(interval > 5.0);
        assert!(ease > 2.5);
    }

    #[test]
    fn test_good_uses_ease_factor() {
        let (interval, ease) = calculate_next_interval(5.0, 2.5, "good");
        assert_eq!(interval, 12.5);
        assert_eq!(ease, 2.5);
    }

    #[test]
    fn test_ease_floor() {
        let (_, ease) = calculate_next_interval(0.0, 1.3, "again");
        assert!(ease >= 1.3);
    }
}
