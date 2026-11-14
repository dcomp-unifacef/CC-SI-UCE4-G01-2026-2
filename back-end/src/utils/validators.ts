import { BadRequestError } from '../errors/BadRequestError.ts'


export type Corpo = Record<string, unknown>

const ID_MAXIMO = 2147483647 // limite do tipo INTEGER do PostgreSQL


// Garante que o corpo da requisição é um objeto JSON
export function exigirCorpo(data: unknown): Corpo {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new BadRequestError('Corpo da requisição inválido.')
  }

  return data as Corpo
}


// O id chega como string pelo Express e é convertido para number no controller
export function validarId(id: number): void {
  if (!Number.isInteger(id) || id <= 0 || id > ID_MAXIMO) {
    throw new BadRequestError('Identificador inválido.')
  }
}


export function textoObrigatorio(corpo: Corpo, campo: string): string {
  const valor = corpo[campo]

  if (valor === undefined || valor === null) {
    throw new BadRequestError(`O campo "${campo}" é obrigatório.`)
  }

  if (typeof valor !== 'string') {
    throw new BadRequestError(`O campo "${campo}" é inválido.`)
  }

  const texto = valor.trim()

  if (texto === '') {
    throw new BadRequestError(`O campo "${campo}" é obrigatório.`)
  }

  return texto
}


// Campo de texto que pode ficar sem valor: ausente (undefined),
// nulo ou vazio (null) ou texto.
export function textoOpcional(corpo: Corpo, campo: string): string | null | undefined {
  const valor = corpo[campo]

  if (valor === undefined) return undefined
  if (valor === null) return null

  if (typeof valor !== 'string') {
    throw new BadRequestError(`O campo "${campo}" é inválido.`)
  }

  const texto = valor.trim()
  return texto === '' ? null : texto
}


export function inteiroObrigatorio(corpo: Corpo, campo: string): number {
  const valor = corpo[campo]

  if (valor === undefined || valor === null) {
    throw new BadRequestError(`O campo "${campo}" é obrigatório.`)
  }

  if (typeof valor !== 'number' || !Number.isInteger(valor)) {
    throw new BadRequestError(`O campo "${campo}" é inválido.`)
  }

  return valor
}


export function inteiroOpcional(corpo: Corpo, campo: string): number | undefined {
  if (corpo[campo] === undefined) return undefined
  return inteiroObrigatorio(corpo, campo)
}


export function booleanoOpcional(corpo: Corpo, campo: string): boolean | undefined {
  const valor = corpo[campo]

  if (valor === undefined) return undefined

  if (typeof valor !== 'boolean') {
    throw new BadRequestError(`O campo "${campo}" é inválido.`)
  }

  return valor
}


// Converte um texto ISO ('2026-09-15' ou '2026-09-15T00:00:00.000Z') em uma
// data (sem horário). Devolve null se o valor não for uma data válida.
export function converterData(valor: unknown): Date | null {
  if (typeof valor !== 'string') return null

  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor)
  if (partes === null) return null

  const ano = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])

  // O JavaScript "corrige" datas impossíveis (31/02 vira 03/03);
  // aqui elas são recusadas.
  const data = new Date(Date.UTC(ano, mes - 1, dia))

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null
  }

  // Se vier horário (ISO completo), ele também deve ser válido
  if (valor.length > 10 && Number.isNaN(new Date(valor).getTime())) return null

  return data
}


// Data de hoje no fuso do consultório, no formato AAAA-MM-DD
export function hoje(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}


export function dataFutura(data: Date): boolean {
  return data.toISOString().slice(0, 10) > hoje()
}


export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}


// Códigos de erro do Prisma que as regras de negócio tratam como conflito
export function erroPrisma(error: unknown, codigo: string): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === codigo
}
