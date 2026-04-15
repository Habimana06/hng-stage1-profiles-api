const Database = require("better-sqlite3");
const path = require("path");

function resolvePreferredDbFile() {
  if (process.env.SQLITE_PATH) {
    return path.resolve(process.env.SQLITE_PATH);
  }

  // Vercel runtime is read-only except /tmp.
  if (process.env.VERCEL) {
    return "/tmp/data.sqlite";
  }

  return path.resolve(__dirname, "data.sqlite");
}

function openDatabase() {
  const preferred = resolvePreferredDbFile();
  try {
    return new Database(preferred);
  } catch {
    // Final safety net for serverless/read-only runtimes.
    return new Database("/tmp/data.sqlite");
  }
}

const db = openDatabase();

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    gender TEXT NOT NULL,
    gender_probability REAL NOT NULL,
    sample_size INTEGER NOT NULL,
    age INTEGER NOT NULL,
    age_group TEXT NOT NULL,
    country_id TEXT NOT NULL,
    country_probability REAL NOT NULL,
    created_at TEXT NOT NULL
  );
`);

module.exports = { db };

