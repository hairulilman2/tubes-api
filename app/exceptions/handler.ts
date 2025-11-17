import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class Handler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    // Force JSON response for API routes
    if (ctx.request.url().startsWith('/api/')) {
      ctx.response.header('Content-Type', 'application/json')
      
      /**
       * Self handle the validation exception
       */
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'E_VALIDATION_ERROR') {
          return ctx.response.status(422).json({
            message: 'Validation failed',
            errors: error
          })
        }
      }

      // Handle other errors as JSON for API routes
      const status = (error as any)?.status || 500
      const message = (error as any)?.message || 'Internal server error'
      
      return ctx.response.status(status).json({
        message,
        error: this.debug ? error : undefined
      })
    }

    /**
     * Forward rest of the exceptions to the parent class
     */
    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error reporting service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}