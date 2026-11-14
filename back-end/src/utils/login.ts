import { BadRequestError } from '../errors/BadRequestError.ts'


declare const marca: unique symbol

export type LoginNormalizado = string & { readonly [marca]: true }


export function normalizarLogin(valor: unknown): LoginNormalizado {
  if (typeof valor !== 'string') {
    throw new BadRequestError('O campo "login" é inválido.')
  }

  const login = valor.trim().toLowerCase()

  if (login === '') {
    throw new BadRequestError('O campo "login" é obrigatório.')
  }

  return login as LoginNormalizado
}
