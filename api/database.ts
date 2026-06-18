import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.resolve(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.resolve(dataDir, 'cable-manager.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    model TEXT NOT NULL,
    interface_type TEXT NOT NULL,
    length TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '黑色',
    purchase_date TEXT NOT NULL,
    expected_life_days INTEGER NOT NULL DEFAULT 730,
    status TEXT NOT NULL DEFAULT '正常' CHECK(status IN ('正常','损坏','丢失')),
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cable_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    FOREIGN KEY (cable_id) REFERENCES cables(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_cables_user_id ON cables(user_id);
  CREATE INDEX IF NOT EXISTS idx_cables_status ON cables(status);
  CREATE INDEX IF NOT EXISTS idx_cables_interface_type ON cables(interface_type);
  CREATE INDEX IF NOT EXISTS idx_cables_purchase_date ON cables(purchase_date);
  CREATE INDEX IF NOT EXISTS idx_devices_cable_id ON devices(cable_id);
`)

export default db
