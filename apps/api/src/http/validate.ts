import type { ZodError, ZodTypeAny, z } from 'zod'
import { ZodError as ZodErrorClass } from 'zod'
import { BadRequestError } from './errors.js'

/** Flattens Zod's issue list into one line a human can act on. */
export function describeZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join('; ')
}

/**
 * Generic over the schema rather than its output type, so schemas that apply
 * defaults still narrow to the parsed (non-optional) shape.
 */
export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new BadRequestError(describeZodError(result.error), 'invalid_body')
  }
  return result.data
}

export function parseQuery<S extends ZodTypeAny>(schema: S, query: unknown): z.infer<S> {
  const result = schema.safeParse(query)
  if (!result.success) {
    throw new BadRequestError(describeZodError(result.error), 'invalid_query')
  }
  return result.data
}

export { ZodErrorClass as ZodError }
