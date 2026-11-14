import { AppError } from './AppError.ts'


export class ConflictError extends AppError {
  constructor(message = 'A requisição conflita com o estado atual dos dados.') {
    super(message, 409)
    this.name = 'ConflictError'
  }
}
