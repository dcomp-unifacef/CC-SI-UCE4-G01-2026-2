import { createHash, randomBytes } from 'node:crypto'

import { BadRequestError } from '../errors/BadRequestError.ts'


const BYTES_DO_TOKEN = 32


export function hashDoToken(token: unknown): string {
  if (typeof token !== 'string' || token === '') {
    throw new BadRequestError('Token inválido.')
  }

  return createHash('sha256').update(token, 'utf8').digest('hex')
}


export function gerarToken(): { token: string; hash: string } {
  const token = randomBytes(BYTES_DO_TOKEN).toString('base64url')

  return { token, hash: hashDoToken(token) }
}
