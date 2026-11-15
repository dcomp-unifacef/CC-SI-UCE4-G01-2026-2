import { AppError } from './AppError.ts'


export class ServiceUnavailableError extends AppError {
  constructor(message = 'Serviço indisponível no momento.') {
    super(message, 503)
    this.name = 'ServiceUnavailableError'
  }
}
