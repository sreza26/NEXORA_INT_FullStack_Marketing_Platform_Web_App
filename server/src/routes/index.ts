import { Router } from 'express'
import adminRoutes from './admin.js'
import authRoutes from './auth.js'
import developerRoutes from './developer.js'
import memberRoutes from './member.js'
import publicRoutes from './public.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/member', memberRoutes)
router.use('/admin', adminRoutes)
router.use('/developer', developerRoutes)
router.use('/public', publicRoutes)

export default router
