export type StatusConsulta =
  | 'AGENDADA'
  | 'CONFIRMADA'
  | 'REALIZADA'
  | 'FALTOU'
  | 'CANCELADA'

export type Consulta = {
  id: number
  paciente: {
    id: number
    nome: string
    telefone: string
  }
  dentista: {
    id: number
    nome: string
  }
  inicio_em: string
  fim_em: string
  duracao_min: number
  status: StatusConsulta
  encaixe: boolean
  criada_em: string
  atualizada_em: string
}

export type ConsultaRealizada = Consulta & {
  visita: {
    id: number
    data_visita: string
  }
  retorno: {
    id: number
    data_prevista: string
  }
}

export const SITUACOES: Record<
  StatusConsulta,
  { rotulo: string; classe: string }
> = {
  AGENDADA: { rotulo: 'Agendada', classe: 'text-bg-primary' },
  CONFIRMADA: { rotulo: 'Confirmada', classe: 'text-bg-success' },
  REALIZADA: { rotulo: 'Realizada', classe: 'text-bg-secondary' },
  FALTOU: { rotulo: 'Faltou', classe: 'text-bg-warning' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'text-bg-danger' },
}
