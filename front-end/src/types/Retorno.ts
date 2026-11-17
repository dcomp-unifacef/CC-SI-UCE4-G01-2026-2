export type SituacaoRetorno = 'ABERTO' | 'ATENDIDO' | 'DESCARTADO'

export type Retorno = {
  id: number
  paciente: { id: number; nome: string; telefone: string }
  visita_origem: { id: number; data_visita: string; dentista_id: number }
  data_prevista: string
  situacao: SituacaoRetorno
  criado_em: string
  encerrado_em: string | null
  encerrado_por_id: number | null
  motivo_descarte?: string | null
}

export type Atraso = {
  paciente: { id: number; nome: string; telefone: string }
  ultima_visita: {
    id: number
    data_visita: string
    dentista: { id: number; nome: string }
  }
  dias_desde: number
  meses_desde: number
  retorno: { id: number; data_prevista: string; vencido: boolean } | null
  retorno_descartado: boolean
}

export type ResultadoContato = 'SEM_RESPOSTA' | 'AGENDOU' | 'RECUSOU'

export type Contato = {
  id: number
  paciente_id: number
  resultado: ResultadoContato
  anotacao?: string | null
  registrado_em: string
  usuario: { id: number; nome: string }
}

export type HistoricoRetorno = {
  id: number
  tipo: 'CRIACAO' | 'CORRECAO_DE_DATA' | 'DESCARTE' | 'ATENDIMENTO'
  data_anterior: string | null
  data_nova: string | null
  situacao_anterior: SituacaoRetorno | null
  situacao_nova: SituacaoRetorno
  motivo?: string | null
  registrado_em: string
  usuario: { id: number; nome: string }
}

export const SITUACOES_RETORNO: Record<
  SituacaoRetorno,
  { rotulo: string; classe: string }
> = {
  ABERTO: { rotulo: 'Aberto', classe: 'text-bg-primary' },
  ATENDIDO: { rotulo: 'Atendido', classe: 'text-bg-success' },
  DESCARTADO: { rotulo: 'Descartado', classe: 'text-bg-secondary' },
}

export const RESULTADOS: Record<ResultadoContato, string> = {
  SEM_RESPOSTA: 'Sem resposta',
  AGENDOU: 'Agendou',
  RECUSOU: 'Recusou',
}

export const TIPOS_HISTORICO: Record<HistoricoRetorno['tipo'], string> = {
  CRIACAO: 'Criação',
  CORRECAO_DE_DATA: 'Correção de data',
  DESCARTE: 'Descarte',
  ATENDIMENTO: 'Atendimento',
}
