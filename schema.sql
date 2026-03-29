DROP TABLE IF EXISTS participants;
CREATE TABLE participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  transcript_json TEXT NOT NULL,
  public_excerpt TEXT NOT NULL,
  short_summary TEXT NOT NULL,
  compliment TEXT NOT NULL,
  situational_score INTEGER NOT NULL,
  coordination_score INTEGER NOT NULL,
  social_score INTEGER NOT NULL,
  open_index INTEGER NOT NULL,
  curated_index INTEGER NOT NULL,
  stance_score INTEGER NOT NULL,
  temporary_lean TEXT NOT NULL,
  final_group TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, name)
);
