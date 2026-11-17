const FUSO = 'America/Sao_Paulo'

const formatoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const formatoHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  hour: '2-digit',
  minute: '2-digit',
})

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const formatoPartes = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function hoje(): string {
  return formatoDia.format(new Date())
}

export function formatarHora(instante: string): string {
  return formatoHora.format(new Date(instante))
}

export function diaDoInstante(instante: string): string {
  return formatoDia.format(new Date(instante))
}

export function formatarDataHora(instante: string): string {
  return formatoDataHora.format(new Date(instante))
}

export function formatarDiaCivil(dia: string): string {
  const [ano, mes, diaDoMes] = dia.slice(0, 10).split('-')

  return `${diaDoMes}/${mes}/${ano}`
}

function deslocamentoEmMs(instante: number): number {
  const partes = formatoPartes.formatToParts(new Date(instante))

  const valor = (tipo: string): number =>
    Number(partes.find((parte) => parte.type === tipo)?.value)

  const comoUtc = Date.UTC(
    valor('year'),
    valor('month') - 1,
    valor('day'),
    valor('hour'),
    valor('minute'),
    valor('second'),
  )

  return comoUtc - Math.floor(instante / 1000) * 1000
}

export type Visao = 'dia' | 'semana' | 'mes'

function lerDia(dia: string): Date {
  const [ano, mes, diaDoMes] = dia.split('-').map(Number)

  return new Date(Date.UTC(ano, mes - 1, diaDoMes))
}

function escreverDia(data: Date): string {
  return data.toISOString().slice(0, 10)
}

export function deslocarDia(dia: string, dias: number): string {
  const data = lerDia(dia)

  data.setUTCDate(data.getUTCDate() + dias)

  return escreverDia(data)
}

export function deslocarMes(dia: string, meses: number): string {
  const data = lerDia(dia)

  return escreverDia(
    new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + meses, 1)),
  )
}

export function intervaloDaVisao(
  dia: string,
  visao: Visao,
): { inicio: string; fim: string; de: string; ate: string } | null {
  let de = dia
  let depois = deslocarDia(dia, 1)

  if (visao === 'semana') {
    de = deslocarDia(dia, -((lerDia(dia).getUTCDay() + 6) % 7))
    depois = deslocarDia(de, 7)
  }

  if (visao === 'mes') {
    de = deslocarMes(dia, 0)
    depois = deslocarMes(dia, 1)
  }

  const inicio = montarInstante(de, '00:00')
  const fim = montarInstante(depois, '00:00')

  if (inicio === null || fim === null) {
    return null
  }

  return { inicio, fim, de, ate: deslocarDia(depois, -1) }
}

export function montarInstante(dia: string, hora: string): string | null {
  const partesDia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  const partesHora = /^(\d{2}):(\d{2})$/.exec(hora)

  if (partesDia === null || partesHora === null) {
    return null
  }

  const alvo = Date.UTC(
    Number(partesDia[1]),
    Number(partesDia[2]) - 1,
    Number(partesDia[3]),
    Number(partesHora[1]),
    Number(partesHora[2]),
  )

  let instante = alvo - deslocamentoEmMs(alvo)

  instante = alvo - deslocamentoEmMs(instante)

  return new Date(instante).toISOString()
}
