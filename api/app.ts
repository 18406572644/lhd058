import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import cableRoutes from './routes/cables.js'
import deviceRoutes from './routes/devices.js'
import statsRoutes from './routes/stats.js'
import uploadRoutes from './routes/upload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/cables', cableRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/upload', uploadRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error.name === 'MulterError') {
    const multerError = error as any
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: '文件大小超过5MB限制',
      })
      return
    }
    res.status(400).json({
      success: false,
      error: error.message,
    })
    return
  }
  if (error.message && error.message.includes('只允许上传图片文件')) {
    res.status(400).json({
      success: false,
      error: error.message,
    })
    return
  }
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
