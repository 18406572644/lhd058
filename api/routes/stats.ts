import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { authMiddleware } from '../middleware/auth.js'
import { snakeToCamel } from '../utils/transform.js'

const router = Router()

router.use(authMiddleware)

router.get('/overview', (req: Request, res: Response): void => {
  try {
    const total = (db.prepare('SELECT COUNT(*) as count FROM cables WHERE user_id = ?').get(req.userId) as any).count
    const normal = (db.prepare("SELECT COUNT(*) as count FROM cables WHERE user_id = ? AND status = '正常'").get(req.userId) as any).count
    const damaged = (db.prepare("SELECT COUNT(*) as count FROM cables WHERE user_id = ? AND status = '损坏'").get(req.userId) as any).count
    const lost = (db.prepare("SELECT COUNT(*) as count FROM cables WHERE user_id = ? AND status = '丢失'").get(req.userId) as any).count

    const expiringSoon = (db.prepare(
      `SELECT COUNT(*) as count FROM cables
       WHERE user_id = ? AND status = '正常'
       AND julianday(purchase_date, '+' || expected_life_days || ' days') - julianday('now') BETWEEN 0 AND 30`
    ).get(req.userId) as any).count

    res.json({
      success: true,
      data: {
        total,
        normal,
        damaged,
        lost,
        expiringSoon,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取概览统计失败' })
  }
})

router.get('/monthly', (req: Request, res: Response): void => {
  try {
    const months = Math.max(1, Math.min(24, Number(req.query.months) || 6))

    const result: { month: string; added: number; damaged: number; lost: number }[] = []

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i, 1)
      monthStart.setHours(0, 0, 0, 0)

      const nextMonth = new Date(monthStart)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      const monthStr = monthStart.toISOString().slice(0, 7)
      const startStr = monthStart.toISOString().slice(0, 10)
      const endStr = nextMonth.toISOString().slice(0, 10)

      const added = (db.prepare(
        `SELECT COUNT(*) as count FROM cables
         WHERE user_id = ? AND created_at >= ? AND created_at < ?`
      ).get(req.userId, startStr, endStr) as any).count

      const damaged = (db.prepare(
        `SELECT COUNT(*) as count FROM cables
         WHERE user_id = ? AND status = '损坏' AND updated_at >= ? AND updated_at < ?`
      ).get(req.userId, startStr, endStr) as any).count

      const lost = (db.prepare(
        `SELECT COUNT(*) as count FROM cables
         WHERE user_id = ? AND status = '丢失' AND updated_at >= ? AND updated_at < ?`
      ).get(req.userId, startStr, endStr) as any).count

      result.push({ month: monthStr, added, damaged, lost })
    }

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取月度统计失败' })
  }
})

router.get('/expiring', (req: Request, res: Response): void => {
  try {
    const days = Math.max(1, Number(req.query.days) || 30)

    const cables = db.prepare(
      `SELECT *, CAST(julianday(purchase_date, '+' || expected_life_days || ' days') - julianday('now') AS INTEGER) as remaining_days
       FROM cables
       WHERE user_id = ? AND status = '正常'
       AND julianday(purchase_date, '+' || expected_life_days || ' days') - julianday('now') BETWEEN 0 AND ?
       ORDER BY remaining_days ASC`
    ).all(req.userId, days) as any[]

    const data = cables.map((c: any) => {
      const transformed = snakeToCamel(c)
      transformed.daysRemaining = transformed.remainingDays ?? c.remaining_days
      return transformed
    })

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取即将到期数据线失败' })
  }
})

router.get('/brand-life', (req: Request, res: Response): void => {
  try {
    const rows = db.prepare(
      `SELECT brand, COUNT(*) as count, AVG(expected_life_days) as avgLifeDays
       FROM cables
       WHERE user_id = ? AND brand IS NOT NULL AND brand != ''
       GROUP BY brand
       ORDER BY avgLifeDays DESC`
    ).all(req.userId) as any[]

    const data = rows.map((r: any) => ({
      brand: r.brand,
      count: r.count,
      avgLifeDays: Math.round(r.avgLifeDays),
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取品牌寿命统计失败' })
  }
})

router.get('/interface-damage-rate', (req: Request, res: Response): void => {
  try {
    const rows = db.prepare(
      `SELECT interface_type,
              COUNT(*) as total,
              SUM(CASE WHEN status = '损坏' THEN 1 ELSE 0 END) as damaged
       FROM cables
       WHERE user_id = ?
       GROUP BY interface_type
       ORDER BY total DESC`
    ).all(req.userId) as any[]

    const data = rows.map((r: any) => ({
      interfaceType: r.interface_type,
      total: r.total,
      damaged: r.damaged,
      damageRate: r.total > 0 ? Number(((r.damaged / r.total) * 100).toFixed(1)) : 0,
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取接口损坏率统计失败' })
  }
})

router.get('/yearly-cost', (req: Request, res: Response): void => {
  try {
    const rows = db.prepare(
      `SELECT strftime('%Y', purchase_date) as year,
              COUNT(*) as count,
              SUM(price) as totalAmount
       FROM cables
       WHERE user_id = ?
       GROUP BY year
       ORDER BY year DESC`
    ).all(req.userId) as any[]

    const data = rows.map((r: any) => ({
      year: r.year,
      count: r.count,
      totalAmount: Number(Number(r.totalAmount || 0).toFixed(2)),
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取年度费用统计失败' })
  }
})

router.get('/daily-cost', (req: Request, res: Response): void => {
  try {
    const cables = db.prepare(
      `SELECT id, model, brand, price, purchase_date, expected_life_days, status
       FROM cables
       WHERE user_id = ? AND price > 0
       ORDER BY (price / expected_life_days) DESC`
    ).all(req.userId) as any[]

    const data = cables.map((c: any) => {
      const dailyCost = c.expected_life_days > 0 ? c.price / c.expected_life_days : 0
      const daysUsed = Math.min(
        c.expected_life_days,
        Math.max(0, Math.floor((Date.now() - new Date(c.purchase_date).getTime()) / (1000 * 60 * 60 * 24)))
      )
      const totalCostToDate = daysUsed * dailyCost

      return {
        id: c.id,
        model: c.model,
        brand: c.brand,
        price: Number(c.price),
        dailyCost: Number(dailyCost.toFixed(4)),
        expectedLifeDays: c.expected_life_days,
        daysUsed,
        totalCostToDate: Number(totalCostToDate.toFixed(2)),
        status: c.status,
      }
    })

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取日均成本统计失败' })
  }
})

router.get('/color-stats', (req: Request, res: Response): void => {
  try {
    const rows = db.prepare(
      `SELECT color, COUNT(*) as count
       FROM cables
       WHERE user_id = ?
       GROUP BY color
       ORDER BY count DESC`
    ).all(req.userId) as any[]

    const data = rows.map((r: any) => ({
      color: r.color,
      count: r.count,
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取颜色统计失败' })
  }
})

router.get('/length-stats', (req: Request, res: Response): void => {
  try {
    const rows = db.prepare(
      `SELECT length, COUNT(*) as count
       FROM cables
       WHERE user_id = ?
       GROUP BY length
       ORDER BY count DESC`
    ).all(req.userId) as any[]

    const data = rows.map((r: any) => ({
      length: r.length,
      count: r.count,
    }))

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取长度统计失败' })
  }
})

router.get('/summary', (req: Request, res: Response): void => {
  try {
    const totalInvestment = (db.prepare(
      'SELECT SUM(price) as total FROM cables WHERE user_id = ?'
    ).get(req.userId) as any).total || 0

    const avgPrice = (db.prepare(
      'SELECT AVG(price) as avg FROM cables WHERE user_id = ? AND price > 0'
    ).get(req.userId) as any).avg || 0

    const mostCommonColor = (db.prepare(
      `SELECT color, COUNT(*) as count FROM cables WHERE user_id = ? GROUP BY color ORDER BY count DESC LIMIT 1`
    ).get(req.userId) as any)

    const mostCommonInterface = (db.prepare(
      `SELECT interface_type, COUNT(*) as count FROM cables WHERE user_id = ? GROUP BY interface_type ORDER BY count DESC LIMIT 1`
    ).get(req.userId) as any)

    const totalLifeDays = (db.prepare(
      'SELECT SUM(expected_life_days) as total FROM cables WHERE user_id = ?'
    ).get(req.userId) as any).total || 0

    const avgLifeDays = totalInvestment > 0 ? totalLifeDays / (db.prepare('SELECT COUNT(*) as count FROM cables WHERE user_id = ?').get(req.userId) as any).count : 0

    res.json({
      success: true,
      data: {
        totalInvestment: Number(Number(totalInvestment).toFixed(2)),
        avgPrice: Number(Number(avgPrice).toFixed(2)),
        mostCommonColor: mostCommonColor?.color || '',
        mostCommonInterface: mostCommonInterface?.interface_type || '',
        avgLifeDays: Math.round(avgLifeDays),
        totalCables: (db.prepare('SELECT COUNT(*) as count FROM cables WHERE user_id = ?').get(req.userId) as any).count,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取汇总统计失败' })
  }
})

router.get('/export', (req: Request, res: Response): void => {
  try {
    const cables = db.prepare(
      `SELECT c.* FROM cables c
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC`
    ).all(req.userId) as any[]

    const headers = ['ID', '品牌', '型号', '接口类型', '长度', '颜色', '价格', '购买日期', '预期寿命(天)', '状态', '创建时间', '更新时间']
    const rows = cables.map((c: any) => [
      c.id,
      c.brand || '',
      c.model,
      c.interface_type,
      c.length,
      c.color,
      c.price || 0,
      c.purchase_date,
      c.expected_life_days,
      c.status,
      c.created_at,
      c.updated_at,
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const bom = '\uFEFF'
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="cables-export-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send(bom + csvContent)
  } catch (error) {
    res.status(500).json({ success: false, error: '导出失败' })
  }
})

export default router
