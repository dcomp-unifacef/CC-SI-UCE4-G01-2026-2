export type Visita = {
  id: number
  data_visita: string
  registro_antigo: boolean
  paciente_id: number
  dentista_id: number
  consulta_id: number | null
  procedimento_id: number | null
  paciente: { id: number; nome: string; telefone: string }
  dentista: { id: number; nome: string }
  procedimentoCatalogo: { id: number; nome: string } | null
  procedimento?: string
  observacoes?: string | null
  procedimento_exibicao?: string
}
