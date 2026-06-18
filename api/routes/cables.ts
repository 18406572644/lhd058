import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'
import { singleUpload } from '../middleware/upload.js'
import { snakeToCamel } from '../utils/transform.js'

const router = Router()

router.use(authMiddleware)

function getDevicesForCable(cableId: number) {
  const rows = db.prepare(`
    SELECT d.id, d.name, d.device_type as deviceType, d.brand, d.model, d.status, d.is_special as isSpecial
    FROM devices d
    INNER JOIN cable_devices cd ON d.id = cd.device_id
    WHERE cd.cable_id = ?
    ORDER BY d.name ASC
  `).all(cableId) as any[]
  return rows.map((r: any) => ({ ...r, isSpecial: !!r.isSpecial }))
}

function transformCable(cable: any) {
  const transformed = snakeToCamel(cable)
  transformed.devices = getDevicesForCable(cable.id)
  return transformed
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status, interfaceType, length, color, startDate, endDate, page = '1', pageSize = '10' } = req.query

    const conditions: string[] = ['c.user_id = ?']
    const params: any[] = [req.userId]

    if (status) {
      conditions.push('c.status = ?')
      params.push(status)
    }
    if (interfaceType) {
      conditions.push('c.interface_type = ?')
      params.push(interfaceType)
    }
    if (length) {
      conditions.push('c.length = ?')
      params.push(length)
    }
    if (color) {
      conditions.push('c.color = ?')
      params.push(color)
    }
    if (startDate) {
      conditions.push('date(c.purchase_date) >= date(?)')
      params.push(startDate)
    }
    if (endDate) {
      conditions.push('date(c.purchase_date) <= date(?)')
      params.push(endDate)
    }

    const whereClause = conditions.join(' AND ')

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM cables c WHERE ${whereClause}`).get(...params) as any

    const p = Math.max(1, Number(page))
    const ps = Math.max(1, Number(pageSize))
    const offset = (p - 1) * ps

    const cables = db.prepare(
      `SELECT c.* FROM cables c WHERE ${whereClause} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, ps, offset) as any[]

    const list = cables.map(transformCable)

    res.json({
      success: true,
      data: {
        list,
        total: countRow.total,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取数据线列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const cable = db.prepare('SELECT * FROM cables WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!cable) {
      res.status(404).json({ success: false, error: '数据线不存在' })
      return
    }

    const devices = getDevicesForCable(cable.id)

    res.json({
      success: true,
      data: transformCable(cable),
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取数据线详情失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { model, brand, interfaceType, length, color, price, purchaseDate, expectedLifeDays, status, devices, deviceIds } = req.body

    if (!model || !interfaceType || !length || !purchaseDate) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const result = db.prepare(
      `INSERT INTO cables (user_id, model, brand, interface_type, length, color, price, purchase_date, expected_life_days, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.userId,
      model,
      brand || '',
      interfaceType,
      length,
      color || '黑色',
      price || 0,
      purchaseDate,
      expectedLifeDays || 730,
      status || '正常'
    )

    const cableId = Number(result.lastInsertRowid)

    if (Array.isArray(deviceIds) && deviceIds.length > 0) {
      const insertCableDevice = db.prepare('INSERT OR IGNORE INTO cable_devices (cable_id, device_id) VALUES (?, ?)')
      for (const deviceId of deviceIds) {
        const device = db.prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?').get(deviceId, req.userId)
        if (device) {
          insertCableDevice.run(cableId, deviceId)
        }
      }
    } else if (Array.isArray(devices) && devices.length > 0) {
      const insertCableDevice = db.prepare('INSERT OR IGNORE INTO cable_devices (cable_id, device_id) VALUES (?, ?)')
      for (const device of devices) {
        let deviceId: number
        const existingDevice = db.prepare('SELECT id FROM devices WHERE user_id = ? AND name = ?').get(req.userId, device.name) as any
        if (existingDevice) {
          deviceId = existingDevice.id
        } else {
          const result = db.prepare(
            'INSERT INTO devices (user_id, name, device_type) VALUES (?, ?, ?)'
          ).run(req.userId, device.name, device.deviceType || '其他')
          deviceId = Number(result.lastInsertRowid)
        }
        insertCableDevice.run(cableId, deviceId)
      }
    }

    const cable = db.prepare('SELECT * FROM cables WHERE id = ?').get(cableId) as any

    res.status(201).json({
      success: true,
      data: transformCable(cable),
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建数据线失败' })
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const cable = db.prepare('SELECT * FROM cables WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!cable) {
      res.status(404).json({ success: false, error: '数据线不存在' })
      return
    }

    const { model, brand, interfaceType, length, color, price, purchaseDate, expectedLifeDays, status, devices, deviceIds } = req.body

    db.prepare(
      `UPDATE cables SET model = ?, brand = ?, interface_type = ?, length = ?, color = ?, price = ?, purchase_date = ?,
       expected_life_days = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      model ?? cable.model,
      brand ?? cable.brand,
      interfaceType ?? cable.interface_type,
      length ?? cable.length,
      color ?? cable.color,
      price ?? cable.price,
      purchaseDate ?? cable.purchase_date,
      expectedLifeDays ?? cable.expected_life_days,
      status ?? cable.status,
      req.params.id
    )

    if (Array.isArray(deviceIds)) {
      db.prepare('DELETE FROM cable_devices WHERE cable_id = ?').run(req.params.id)
      if (deviceIds.length > 0) {
        const insertCableDevice = db.prepare('INSERT OR IGNORE INTO cable_devices (cable_id, device_id) VALUES (?, ?)')
        for (const deviceId of deviceIds) {
          const device = db.prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?').get(deviceId, req.userId)
          if (device) {
            insertCableDevice.run(Number(req.params.id), deviceId)
          }
        }
      }
    } else if (Array.isArray(devices)) {
      db.prepare('DELETE FROM cable_devices WHERE cable_id = ?').run(req.params.id)
      if (devices.length > 0) {
        const insertCableDevice = db.prepare('INSERT OR IGNORE INTO cable_devices (cable_id, device_id) VALUES (?, ?)')
        for (const device of devices) {
          let deviceId: number
          const existingDevice = db.prepare('SELECT id FROM devices WHERE user_id = ? AND name = ?').get(req.userId, device.name) as any
          if (existingDevice) {
            deviceId = existingDevice.id
          } else {
            const result = db.prepare(
              'INSERT INTO devices (user_id, name, device_type) VALUES (?, ?, ?)'
            ).run(req.userId, device.name, device.deviceType || '其他')
            deviceId = Number(result.lastInsertRowid)
          }
          insertCableDevice.run(Number(req.params.id), deviceId)
        }
      }
    }

    const updatedCable = db.prepare('SELECT * FROM cables WHERE id = ?').get(req.params.id) as any

    res.json({
      success: true,
      data: transformCable(updatedCable),
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新数据线失败' })
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const cable = db.prepare('SELECT * FROM cables WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!cable) {
      res.status(404).json({ success: false, error: '数据线不存在' })
      return
    }

    db.prepare('DELETE FROM cables WHERE id = ?').run(req.params.id)

    res.json({
      success: true,
      data: null,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除数据线失败' })
  }
})

router.patch('/:id/status', (req: Request, res: Response): void => {
  try {
    const { status } = req.body

    if (!status || !['正常', '损坏', '丢失'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' })
      return
    }

    const cable = db.prepare('SELECT * FROM cables WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!cable) {
      res.status(404).json({ success: false, error: '数据线不存在' })
      return
    }

    db.prepare("UPDATE cables SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id)

    const updatedCable = db.prepare('SELECT * FROM cables WHERE id = ?').get(req.params.id) as any

    res.json({
      success: true,
      data: snakeToCamel(updatedCable),
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新状态失败' })
  }
})

router.post('/:id/image', singleUpload, (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请上传图片' })
      return
    }

    const cable = db.prepare('SELECT * FROM cables WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any
    if (!cable) {
      res.status(404).json({ success: false, error: '数据线不存在' })
      return
    }

    const imageUrl = `/uploads/${req.file.filename}`

    db.prepare("UPDATE cables SET image_url = ?, updated_at = datetime('now') WHERE id = ?").run(imageUrl, req.params.id)

    res.json({
      success: true,
      data: { imageUrl },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '上传图片失败' })
  }
})

export default router
