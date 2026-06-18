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

export default router
