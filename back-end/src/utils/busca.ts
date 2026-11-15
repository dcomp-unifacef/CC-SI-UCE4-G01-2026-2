import { BadRequestError } from '../errors/BadRequestError.ts'


export type Busca =
  | { tipo: 'cpf'; prefixo: string }
  | { tipo: 'nome'; termos: string[] }


export function semAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}


export function interpretarBusca(texto: string): Busca {
  const limpo = texto.trim()

  if (/^[\d.\-\s]+$/.test(limpo)) {
    const digitos = limpo.replace(/\D/g, '')

    if (digitos.length < 3 || digitos.length > 11) {
      throw new BadRequestError('Informe de 3 a 11 dígitos do CPF.')
    }

    return { tipo: 'cpf', prefixo: digitos }
  }

  const termos = semAcentos(limpo).split(/\s+/).filter(Boolean)

  if (termos.join('').length < 2) {
    throw new BadRequestError('Informe ao menos 2 letras do nome.')
  }

  return { tipo: 'nome', termos }
}
