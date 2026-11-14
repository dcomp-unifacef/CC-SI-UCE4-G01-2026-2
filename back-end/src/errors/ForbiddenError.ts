import { AppError } from './AppError.ts'


export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado.') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}
