import { AppError } from './AppError.ts'


export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado.') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}
