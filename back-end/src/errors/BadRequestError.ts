import { AppError } from './AppError.ts'


export class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida.') {
    super(message, 400)
    this.name = 'BadRequestError'
  }
}
