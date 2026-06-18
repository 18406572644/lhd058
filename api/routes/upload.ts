import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { singleUpload } from '../middleware/upload.js'

const router = Router()

router.use(authMiddleware)

router.post('/', singleUpload, (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: '请上传图片' })
      return
    }

    const url = `/uploads/${req.file.filename}`

    res.json({
      success: true,
      data: { url },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '上传失败' })
  }
})

export default router
