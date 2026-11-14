import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

import { BadRequestError } from '../errors/BadRequestError.ts'


const ALGORITMO = 'scrypt'

const CUSTO = 65536
const BLOCO = 8
const PARALELISMO = 2

const TAMANHO_SAL = 16
const TAMANHO_HASH = 64

const SENHA_MINIMA = 8
const SENHA_MAXIMA = 128

const CUSTO_MINIMO = 2 ** 14
const CUSTO_MAXIMO = 2 ** 18
const BLOCO_MAXIMO = 16
const PARALELISMO_MAXIMO = 4
const HASH_MINIMO = 16
const HASH_MAXIMO = 128

const TAMANHO_MAXIMO_TENTATIVA = SENHA_MAXIMA * 2


function derivar(
  senha: string,
  sal: Buffer,
  tamanho: number,
  custo: number,
  bloco: number,
  paralelismo: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      senha,
      sal,
      tamanho,
      {
        N: custo,
        r: bloco,
        p: paralelismo,
        maxmem: 128 * custo * bloco * 2,
      },
      (erro, chave) => (erro ? reject(erro) : resolve(chave))
    )
  })
}


export function validarSenha(valor: unknown): string {
  if (typeof valor !== 'string') {
    throw new BadRequestError('O campo "senha" é inválido.')
  }

  const caracteres = Array.from(valor).length

  if (caracteres < SENHA_MINIMA || caracteres > SENHA_MAXIMA) {
    throw new BadRequestError(
      `A senha deve ter entre ${SENHA_MINIMA} e ${SENHA_MAXIMA} caracteres.`
    )
  }

  return valor
}


export async function gerarHashSenha(senha: unknown): Promise<string> {
  const valida = validarSenha(senha)
  const sal = randomBytes(TAMANHO_SAL)
  const hash = await derivar(valida, sal, TAMANHO_HASH, CUSTO, BLOCO, PARALELISMO)

  return [
    ALGORITMO,
    CUSTO,
    BLOCO,
    PARALELISMO,
    sal.toString('base64url'),
    hash.toString('base64url'),
  ].join('$')
}


function inteiroPositivo(texto: string | undefined): number | null {
  if (texto === undefined || !/^[0-9]{1,9}$/.test(texto)) return null

  const numero = Number(texto)
  return numero > 0 ? numero : null
}


export async function verificarSenha(senha: unknown, guardado: unknown): Promise<boolean> {
  if (typeof senha !== 'string' || senha.length > TAMANHO_MAXIMO_TENTATIVA) return false
  if (typeof guardado !== 'string') return false

  const partes = guardado.split('$')
  if (partes.length !== 6 || partes[0] !== ALGORITMO) return false

  const custo = inteiroPositivo(partes[1])
  const bloco = inteiroPositivo(partes[2])
  const paralelismo = inteiroPositivo(partes[3])

  if (custo === null || bloco === null || paralelismo === null) return false

  const custoValido = custo >= CUSTO_MINIMO && custo <= CUSTO_MAXIMO && (custo & (custo - 1)) === 0
  if (!custoValido || bloco > BLOCO_MAXIMO || paralelismo > PARALELISMO_MAXIMO) return false

  if (!/^[A-Za-z0-9_-]+$/.test(partes[4] ?? '') || !/^[A-Za-z0-9_-]+$/.test(partes[5] ?? '')) {
    return false
  }

  const sal = Buffer.from(partes[4] ?? '', 'base64url')
  const esperado = Buffer.from(partes[5] ?? '', 'base64url')

  if (sal.length === 0 || esperado.length < HASH_MINIMO || esperado.length > HASH_MAXIMO) {
    return false
  }

  const calculado = await derivar(senha, sal, esperado.length, custo, bloco, paralelismo)

  return timingSafeEqual(calculado, esperado)
}
