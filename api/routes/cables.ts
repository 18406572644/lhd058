import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'
import { singleUpload } from '../middleware/upload.js'
import { snakeToCamel } from '../utils/transform.js'

const router = Router()

router.use(authMiddleware)

function getDevicesForCable(cableId: number) {
  return db.prepare('SELECT id, name, device_type as deviceType FROM devices WHERE cable_id = ?').all(cableId)
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
    const { model, brand, interfaceType, length, color, price, purchaseDate, expectedLifeDays, status, devices } = req.body

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

    const insertDevice = db.prepare('INSERT INTO devices (cable_id, name, device_type) VALUES (?, ?, ?)')
    if (Array.isArray(devices)) {
      for (const device of devices) {
        insertDevice.run(cableId, device.name, device.deviceType)
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

    const { model, brand, interfaceType, length, color, price, purchaseDate, expectedLifeDays, status, devices } = req.body

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

    if (Array.isArray(devices)) {
      db.prepare('DELETE FROM devices WHERE cable_id = ?').run(req.params.id)
      const insertDevice = db.prepare('INSERT INTO devices (cable_id, name, device_type) VALUES (?, ?, ?)')
      for (const device of devices) {
        insertDevice.run(Number(req.params.id), device.name, device.deviceType)
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
