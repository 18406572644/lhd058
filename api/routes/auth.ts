import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../database.js'
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body

    if (!username || username.length < 3 || username.length > 20) {
      res.status(400).json({ success: false, error: '用户名长度应为3-20个字符' })
      return
    }

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: '密码长度至少6个字符' })
      return
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) {
      res.status(400).json({ success: false, error: '用户名已存在' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword)

    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' })

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: result.lastInsertRowid,
          username,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '注册失败' })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({ success: false, error: '请提供用户名和密码' })
      return
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any
    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  try {
    const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(req.userId) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        created_at: user.created_at,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

export default router
