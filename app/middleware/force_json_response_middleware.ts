import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class ForceJsonResponseMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    if (request.url().startsWith('/api/')) {
      request.headers().accept = 'application/json'
      response.header('Content-Type', 'application/json')
    }

    try {
      const output = await next()
      if (request.url().startsWith('/api/')) {
        response.header('Content-Type', 'application/json')
      }
      return output
    } catch (error) {
      if (request.url().startsWith('/api/')) {
        response.header('Content-Type', 'application/json')
        return response.status(500).json({
          message: 'Internal server error',
          error: error.message,
        })
      }
      throw error
    }
  }
}
