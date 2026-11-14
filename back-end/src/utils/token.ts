import { createHash, randomBytes } from 'node:crypto'

import { BadRequestError } from '../errors/BadRequestError.ts'


const BYTES_DO_TOKEN = 32


// Calcula o hash (SHA-256, em hexadecimal) de um token. É o hash que fica
// no banco: o token em texto só existe no cookie e na memória.
// Como o token tem alta entropia, o SHA-256 simples é adequado (diferente
// de uma senha, que exigiria um hash lento).
export function hashDoToken(token: unknown): string {
  if (typeof token !== 'string' || token === '') {
    throw new BadRequestError('Token inválido.')
  }

  return createHash('sha256').update(token, 'utf8').digest('hex')
}


// Gera um token aleatório com o recurso criptográfico nativo do Node
// (32 bytes, em base64url) e o hash correspondente.
// O token NUNCA deve ser gravado no banco nem registrado em log.
export function gerarToken(): { token: string; hash: string } {
  const token = randomBytes(BYTES_DO_TOKEN).toString('base64url')

  return { token, hash: hashDoToken(token) }
}
