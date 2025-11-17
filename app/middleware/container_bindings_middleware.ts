import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Container bindings middleware is used to bind values to the IoC
 * container for a given HTTP request.
 */
export default class ContainerBindingsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Call next method in the pipeline
     */
    const output = await next()
    return output
  }
}
