import { BadRequestError } from '../errors/BadRequestError.ts'


declare const marca: unique symbol

// Login já normalizado. Só normalizarLogin() produz este tipo: assim o
// TypeScript impede que um texto cru chegue ao repository, e o login é
// normalizado do mesmo modo ao gravar e ao buscar.
export type LoginNormalizado = string & { readonly [marca]: true }


// Normalização aprovada: remove os espaços das extremidades e converte
// para minúsculas. Espaços internos e acentos não são alterados.
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
