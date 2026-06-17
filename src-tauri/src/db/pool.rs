use rusqlite::{Connection, Result};
use std::path::Path;

pub fn open_connection(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    Ok(conn)
}

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(include_str!("../../migrations/001_initial_schema.sql"))?;
    conn.execute_batch(include_str!("../../migrations/002_anki_schema.sql"))?;
    conn.execute_batch(include_str!("../../migrations/003_session_ratings.sql"))?;
    conn.execute_batch(include_str!("../../migrations/004_writing_score_history.sql"))?;
    // 005: add cross_exam_results_json — ignore error if column already exists
    let _ = conn.execute_batch(include_str!("../../migrations/005_writing_cross_exam_results.sql"));
    conn.execute_batch(include_str!("../../migrations/006_study_activities.sql"))?;
    Ok(())
}
