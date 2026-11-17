export type SituacaoOrcamento = 'PENDENTE' | 'APROVADO' | 'RECUSADO'

export type ItemOrcamento = {
  id: number
  procedimento_id: number
  nome_procedimento: string
  valor_unitario_centavos: number
  quantidade: number
  subtotal_centavos: number
}

export type OrcamentoResumo = {
  id: number
  paciente: { id: number; nome: string; telefone: string }
  dentista: { id: number; nome: string } | null
  situacao: SituacaoOrcamento
  total_centavos: number
  valido_ate: string | null
  criado_em: string
  atualizado_em: string
  criado_por: { id: number; nome: string }
  decidido_em: string | null
  decidido_por: { id: number; nome: string } | null
  quantidade_itens: number
}

export type Orcamento = Omit<OrcamentoResumo, 'quantidade_itens'> & {
  itens: ItemOrcamento[]
}

export type HistoricoOrcamento = {
  id: number
  tipo: 'CRIACAO' | 'ALTERACAO' | 'DECISAO' | 'CORRECAO' | 'REABERTURA'
  situacao_anterior: SituacaoOrcamento | null
  situacao_nova: SituacaoOrcamento
  total_anterior_centavos: number | null
  total_novo_centavos: number | null
  motivo?: string | null
  registrado_em: string
  usuario: { id: number; nome: string }
}

export const SITUACOES_ORCAMENTO: Record<
  SituacaoOrcamento,
  { rotulo: string; classe: string }
> = {
  PENDENTE: { rotulo: 'Pendente', classe: 'text-bg-warning' },
  APROVADO: { rotulo: 'Aprovado', classe: 'text-bg-success' },
  RECUSADO: { rotulo: 'Recusado', classe: 'text-bg-danger' },
}

export const TIPOS_HISTORICO_ORCAMENTO: Record<
  HistoricoOrcamento['tipo'],
  string
> = {
  CRIACAO: 'Criação',
  ALTERACAO: 'Alteração',
  DECISAO: 'Decisão',
  CORRECAO: 'Correção',
  REABERTURA: 'Reabertura',
}
