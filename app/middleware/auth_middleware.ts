import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import mongoService from '#services/mongodb_service'
import { ObjectId } from 'mongodb'

/**
 * Auth middleware is used to authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class AuthMiddleware {
  /**
   * The URL to redirect to, when authentication fails
   */
  redirectTo = '/login'

  async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('authorization')

    if (!authHeader) {
      return ctx.response.status(401).json({ message: 'Authentication required' })
    }

    try {
      await mongoService.connect()
      const token = authHeader.replace('Bearer ', '')
      const decoded = Buffer.from(token, 'base64').toString('ascii')
      const [userId] = decoded.split(':')

      const user = await mongoService.findOne('users', {
        _id: new ObjectId(userId),
      })

      if (!user) {
        return ctx.response.status(401).json({ message: 'Invalid token' })
      }

      // Add user to context (extend ctx with user property)
      ;(ctx as any).user = user

      return await next()
    } catch (error) {
      return ctx.response.status(401).json({ message: 'Invalid token' })
    }
  }
}
