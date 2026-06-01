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
    Ok(())
}
