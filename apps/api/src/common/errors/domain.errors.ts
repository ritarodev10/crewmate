// =============================================================================
// Domain errors — thrown from the service layer, mapped to HTTP responses
// by the global HttpExceptionFilter.
// =============================================================================

export abstract class DomainError extends Error {
  abstract readonly httpStatus: number
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    // Ensure prototype chain is correct for `instanceof` checks
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// -----------------------------------------------------------------------------
// Auth errors
// -----------------------------------------------------------------------------

export class InvalidCredentialsError extends DomainError {
  readonly httpStatus = 401
  readonly code = 'INVALID_CREDENTIALS'

  constructor() {
    super('Invalid email or password')
  }
}

// -----------------------------------------------------------------------------
// Job errors
// -----------------------------------------------------------------------------

export class JobNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'JOB_NOT_FOUND'

  constructor(jobId: string) {
    super(`Job ${jobId} not found`)
  }
}

export class InvalidStatusTransitionError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'INVALID_STATUS_TRANSITION'

  constructor(from: string, to: string) {
    super(`Cannot transition job from ${from} to ${to}`)
  }
}

export class JobAlreadyCancelledError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'JOB_ALREADY_CANCELLED'

  constructor(jobId: string) {
    super(`Job ${jobId} is already cancelled`)
  }
}

export class JobProgressBusinessError extends DomainError {
  readonly httpStatus = 422
  readonly code = 'JOB_PROGRESS_INVALID'

  constructor(message: string) {
    super(message)
  }
}

// -----------------------------------------------------------------------------
// Worker errors
// -----------------------------------------------------------------------------

export class WorkerNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'WORKER_NOT_FOUND'

  constructor(workerId: string) {
    super(`Worker ${workerId} not found`)
  }
}
