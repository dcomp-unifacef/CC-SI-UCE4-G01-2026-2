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
