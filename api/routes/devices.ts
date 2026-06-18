import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'
import { snakeToCamel } from '../utils/transform.js'

const router = Router()

router.use(authMiddleware)

function getCablesForDevice(deviceId: number) {
  const rows = db.prepare(`
    SELECT c.* FROM cables c
    INNER JOIN cable_devices cd ON c.id = cd.cable_id
    WHERE cd.device_id = ?
    ORDER BY c.created_at DESC
  `).all(deviceId) as any[]
  return rows.map(snakeToCamel)
}

function transformDevice(device: any, includeCables = true) {
  const transformed = snakeToCamel(device)
  transformed.isSpecial = !!device.is_special
  if (includeCables) {
    transformed.cables = getCablesForDevice(device.id)
  }
  return transformed
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status, deviceType, page = '1', pageSize = '10', keyword } = req.query

    const conditions: string[] = ['d.user_id = ?']
    const params: any[] = [req.userId]

    if (status) {
      conditions.push('d.status = ?')
      params.push(status)
    }
    if (deviceType) {
      conditions.push('d.device_type = ?')
      params.push(deviceType)
    }
    if (keyword) {
      conditions.push('(d.name LIKE ? OR d.brand LIKE ? OR d.model LIKE ?)')
      const kw = `%${keyword}%`
      params.push(kw, kw, kw)
    }

    const whereClause = conditions.join(' AND ')

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM devices d WHERE ${whereClause}`).get(...params) as any

    const p = Math.max(1, Number(page))
    const ps = Math.max(1, Number(pageSize))
    const offset = (p - 1) * ps

    const devices = db.prepare(
      `SELECT d.* FROM devices d WHERE ${whereClause} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, ps, offset) as any[]

    const list = devices.map(d => transformDevice(d, true))

    res.json({
      success: true,
      data: {
        list,
        total: countRow.total,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取设备列表失败' })
  }
})

router.get('/all', (req: Request, res: Response): void => {
  try {
    const devices = db.prepare(
      'SELECT * FROM devices WHERE user_id = ? ORDER BY name ASC'
    ).all(req.userId) as any[]

    const list = devices.map(d => snakeToCamel({ ...d, is_special: !!d.is_special }))

    res.json({
      success: true,
      data: list,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取设备列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const device = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!device) {
      res.status(404).json({ success: false, error: '设备不存在' })
      return
    }

    res.json({
      success: true,
      data: transformDevice(device, true),
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取设备详情失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, brand, model, deviceType, purchaseDate, price, status, isSpecial, note, cableIds } = req.body

    if (!name || !deviceType) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const result = db.prepare(
      `INSERT INTO devices (user_id, name, brand, model, device_type, purchase_date, price, status, is_special, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.userId,
      name,
      brand || '',
      model || '',
      deviceType,
      purchaseDate || null,
      price || 0,
      status || '在用',
      isSpecial ? 1 : 0,
      note || ''
    )

    const deviceId = Number(result.lastInsertRowid)

    if (Array.isArray(cableIds) && cableIds.length > 0) {
      const insertCableDevice = db.prepare('INSERT OR IGNORE INTO cable_devices (cable_id, device_id) VALUES (?, ?)')
      for (const cableId of cableIds) {
        const cable = db.prepare('SELECT id FROM cables WHERE id = ? AND user_id = ?').get(cableId, req.userId)
        if (cable) {
          insertCableDevice.run(cableId, deviceId)
        }
      }
    }

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) as any

    res.status(201).json({
      success: true,
      data: transformDevice(device, true),
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建设备失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const device = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!device) {
      res.status(404).json({ success: false, error: '设备不存在' })
      return
    }

    const { name, brand, model, deviceType, purchaseDate, price, status, isSpecial, note, cableIds } = req.body

    db.prepare(
      `UPDATE devices SET name = ?, brand = ?, model = ?, device_type = ?, purchase_date = ?,
       price = ?, status = ?, is_special = ?, note = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      name ?? device.name,
      brand ?? device.brand,
      model ?? device.model,
      deviceType ?? device.device_type,
      purchaseDate ?? device.purchase_date,
      price ?? device.price,
      status ?? device.status,
      isSpecial !== undefined ? (isSpecial ? 1 : 0) : device.is_special,
      note ?? device.note,
      req.params.id
    )

    if (Array.isArray(cableIds)) {
      db.prepare('DELETE FROM cable_devices WHERE device_id = ?').run(req.params.id)
      if (cableIds.length > 0) {
        const insertCableDevice = db.prepare('INSERT OR IGNORE INTO cable_devices (cable_id, device_id) VALUES (?, ?)')
        for (const cableId of cableIds) {
          const cable = db.prepare('SELECT id FROM cables WHERE id = ? AND user_id = ?').get(cableId, req.userId)
          if (cable) {
            insertCableDevice.run(cableId, Number(req.params.id))
          }
        }
      }
    }

    const updatedDevice = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id) as any

    res.json({
      success: true,
      data: transformDevice(updatedDevice, true),
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新设备失败' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const device = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!device) {
      res.status(404).json({ success: false, error: '设备不存在' })
      return
    }

    db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id)

    res.json({
      success: true,
      data: null,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除设备失败' })
  }
})

router.patch('/:id/status', (req: Request, res: Response): void => {
  try {
    const { status } = req.body

    if (!status || !['在用', '闲置', '已淘汰'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' })
      return
    }

    const device = db.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!device) {
      res.status(404).json({ success: false, error: '设备不存在' })
      return
    }

    db.prepare("UPDATE devices SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id)

    const updatedDevice = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id) as any

    res.json({
      success: true,
      data: snakeToCamel({ ...updatedDevice, is_special: !!updatedDevice.is_special }),
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新状态失败' })
  }
})

export default router
