const FUSO_DO_CONSULTORIO = 'America/Sao_Paulo'

const PADRAO_DATA_HORA =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/

const PADRAO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/

const formatadorDeDeslocamento = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO_DO_CONSULTORIO,
  timeZoneName: 'longOffset',
})

const formatadorDeExibicao = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_DO_CONSULTORIO,
  dateStyle: 'short',
  timeStyle: 'short',
})


function dataExiste(ano: number, mes: number, dia: number): boolean {
  const conferida = new Date(Date.UTC(ano, mes - 1, dia))

  return (
    conferida.getUTCFullYear() === ano &&
    conferida.getUTCMonth() === mes - 1 &&
    conferida.getUTCDate() === dia
  )
}


export function converterDataHora(valor: unknown): Date | null {
  if (typeof valor !== 'string') return null

  const partes = PADRAO_DATA_HORA.exec(valor)
  if (partes === null) return null

  const ano = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  const hora = Number(partes[4])
  const minuto = Number(partes[5])
  const segundo = Number(partes[6] ?? '0')
  const deslocamento = partes[8] ?? 'Z'

  if (!dataExiste(ano, mes, dia)) return null
  if (hora > 23 || minuto > 59 || segundo > 59) return null

  if (deslocamento !== 'Z') {
    const horasDoDeslocamento = Number(deslocamento.slice(1, 3))
    const minutosDoDeslocamento = Number(deslocamento.slice(4, 6))

    if (horasDoDeslocamento > 23 || minutosDoDeslocamento > 59) return null
  }

  const data = new Date(valor)

  return Number.isNaN(data.getTime()) ? null : data
}


function deslocamentoEmMs(instante: Date): number {
  const nome = formatadorDeDeslocamento
    .formatToParts(instante)
    .find((parte) => parte.type === 'timeZoneName')?.value ?? 'GMT'

  const partes = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(nome)

  if (partes === null || partes[1] === undefined) return 0

  const total = (Number(partes[2]) * 60 + Number(partes[3])) * 60 * 1000

  return partes[1] === '-' ? -total : total
}


function meiaNoiteLocal(ano: number, mes: number, dia: number): Date {
  const referencia = Date.UTC(ano, mes - 1, dia)
  let instante = referencia

  for (let i = 0; i < 3; i++) {
    instante = referencia - deslocamentoEmMs(new Date(instante))
  }

  return new Date(instante)
}


export function limitesDoDia(valor: unknown): { inicio: Date; fim: Date } | null {
  if (typeof valor !== 'string') return null

  const partes = PADRAO_DIA.exec(valor)
  if (partes === null) return null

  const ano = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])

  if (!dataExiste(ano, mes, dia)) return null

  return {
    inicio: meiaNoiteLocal(ano, mes, dia),
    fim: meiaNoiteLocal(ano, mes, dia + 1),
  }
}


const formatadorDeDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_DO_CONSULTORIO,
})


function ultimoDiaDoMes(ano: number, mesIndice: number): number {
  return new Date(Date.UTC(ano, mesIndice + 1, 0)).getUTCDate()
}


export function somarMeses(data: Date, meses: number): Date {
  const total = data.getUTCFullYear() * 12 + data.getUTCMonth() + meses
  const ano = Math.floor(total / 12)
  const mes = total - ano * 12
  const dia = Math.min(data.getUTCDate(), ultimoDiaDoMes(ano, mes))

  return new Date(Date.UTC(ano, mes, dia))
}


export function subtrairMeses(data: Date, meses: number): Date {
  return somarMeses(data, -meses)
}


export function diaCivilNoConsultorio(instante: Date): Date {
  return (
    converterDia(formatadorDeDia.format(instante)) ??
    new Date(
      Date.UTC(
        instante.getUTCFullYear(),
        instante.getUTCMonth(),
        instante.getUTCDate()
      )
    )
  )
}


export function converterDia(valor: unknown): Date | null {
  if (typeof valor !== 'string') return null

  const partes = PADRAO_DIA.exec(valor)
  if (partes === null) return null

  const ano = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])

  if (!dataExiste(ano, mes, dia)) return null

  return new Date(Date.UTC(ano, mes - 1, dia))
}


export function formatarDia(data: Date): string {
  return data.toISOString().slice(0, 10)
}


export function diasEntre(inicio: Date, fim: Date): number {
  return Math.floor((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000))
}


export function mesesCompletosEntre(inicio: Date, fim: Date): number {
  let meses =
    (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 +
    fim.getUTCMonth() -
    inicio.getUTCMonth()

  if (fim.getUTCDate() < inicio.getUTCDate()) {
    meses -= 1
  }

  return Math.max(0, meses)
}


export function formatarDataHora(data: Date): string {
  return formatadorDeExibicao.format(data)
}
