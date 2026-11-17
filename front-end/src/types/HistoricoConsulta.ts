import type { StatusConsulta } from './Consulta'

export type HistoricoConsulta = {
  id: number
  tipo: 'CRIACAO' | 'MUDANCA_DE_STATUS' | 'REAGENDAMENTO'
  status_anterior: StatusConsulta | null
  status_novo: StatusConsulta | null
  inicio_anterior: string | null
  inicio_novo: string | null
  duracao_anterior_min: number | null
  duracao_nova_min: number | null
  motivo_codigo: string | null
  motivo?: string | null
  motivo_exibicao?: string | null
  registrado_em: string
  usuario: { id: number; nome: string }
}
