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
    brand TEXT DEFAULT '',
    interface_type TEXT NOT NULL,
    length TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '黑色',
    price REAL DEFAULT 0,
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
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    device_type TEXT NOT NULL,
    purchase_date TEXT,
    price REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '在用' CHECK(status IN ('在用','闲置','已淘汰')),
    is_special INTEGER NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS cable_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cable_id INTEGER NOT NULL,
    device_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cable_id) REFERENCES cables(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE(cable_id, device_id)
  );
`)

const columns = db.pragma('table_info(cables)') as any[]
const hasBrand = columns.some((c: any) => c.name === 'brand')
const hasPrice = columns.some((c: any) => c.name === 'price')

if (!hasBrand) {
  db.exec('ALTER TABLE cables ADD COLUMN brand TEXT DEFAULT ""')
}
if (!hasPrice) {
  db.exec('ALTER TABLE cables ADD COLUMN price REAL DEFAULT 0')
}

const deviceColumns = db.pragma('table_info(devices)') as any[]
const hasUserId = deviceColumns.some((c: any) => c.name === 'user_id')
const hasDeviceBrand = deviceColumns.some((c: any) => c.name === 'brand')
const hasDeviceModel = deviceColumns.some((c: any) => c.name === 'model')
const hasDeviceStatus = deviceColumns.some((c: any) => c.name === 'status')
const hasIsSpecial = deviceColumns.some((c: any) => c.name === 'is_special')
const hasCableId = deviceColumns.some((c: any) => c.name === 'cable_id')

if (hasCableId && !hasUserId) {
  const devicesNewExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='devices_new'").get()
  if (devicesNewExists) {
    db.exec('DROP TABLE devices_new')
  }
  const cableDevicesExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cable_devices'").get()
  if (cableDevicesExists) {
    db.exec('DROP TABLE cable_devices')
  }

  db.exec(`
    CREATE TABLE devices_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      brand TEXT DEFAULT '',
      model TEXT DEFAULT '',
      device_type TEXT NOT NULL,
      purchase_date TEXT,
      price REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '在用' CHECK(status IN ('在用','闲置','已淘汰')),
      is_special INTEGER NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `)
  
  const oldDevices = db.prepare('SELECT DISTINCT name, device_type FROM devices').all() as any[]
  const insertDevice = db.prepare('INSERT INTO devices_new (name, device_type) VALUES (?, ?)')
  for (const d of oldDevices) {
    insertDevice.run(d.name, d.device_type)
  }
  
  const oldCableDevices = db.prepare('SELECT cable_id, name FROM devices').all() as any[]
  const newDevices = db.prepare('SELECT id, name FROM devices_new').all() as any[]
  const deviceNameMap = new Map(newDevices.map(d => [d.name, d.id]))
  
  db.exec(`
    CREATE TABLE cable_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cable_id INTEGER NOT NULL,
      device_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (cable_id) REFERENCES cables(id) ON DELETE CASCADE,
      FOREIGN KEY (device_id) REFERENCES devices_new(id) ON DELETE CASCADE,
      UNIQUE(cable_id, device_id)
    );
  `)
  
  const insertCableDevice = db.prepare('INSERT INTO cable_devices (cable_id, device_id) VALUES (?, ?)')
  for (const cd of oldCableDevices) {
    const deviceId = deviceNameMap.get(cd.name)
    if (deviceId) {
      insertCableDevice.run(cd.cable_id, deviceId)
    }
  }
  
  db.exec('DROP TABLE devices;')
  db.exec('ALTER TABLE devices_new RENAME TO devices;')
} else {
  if (!hasDeviceBrand) {
    db.exec('ALTER TABLE devices ADD COLUMN brand TEXT DEFAULT ""')
  }
  if (!hasDeviceModel) {
    db.exec('ALTER TABLE devices ADD COLUMN model TEXT DEFAULT ""')
  }
  if (!hasDeviceStatus) {
    db.exec("ALTER TABLE devices ADD COLUMN status TEXT NOT NULL DEFAULT '在用'")
  }
  if (!hasIsSpecial) {
    db.exec('ALTER TABLE devices ADD COLUMN is_special INTEGER NOT NULL DEFAULT 0')
  }
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_cables_user_id ON cables(user_id);
  CREATE INDEX IF NOT EXISTS idx_cables_status ON cables(status);
  CREATE INDEX IF NOT EXISTS idx_cables_interface_type ON cables(interface_type);
  CREATE INDEX IF NOT EXISTS idx_cables_purchase_date ON cables(purchase_date);
  CREATE INDEX IF NOT EXISTS idx_cables_brand ON cables(brand);
  CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
  CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
  CREATE INDEX IF NOT EXISTS idx_devices_device_type ON devices(device_type);
  CREATE INDEX IF NOT EXISTS idx_cable_devices_cable_id ON cable_devices(cable_id);
  CREATE INDEX IF NOT EXISTS idx_cable_devices_device_id ON cable_devices(device_id);
`)

export default db
