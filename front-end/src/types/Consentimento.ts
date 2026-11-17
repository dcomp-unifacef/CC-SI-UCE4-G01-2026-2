export type Consentimento = {
  id: number
  paciente_id: number
  acao: 'CONCESSAO' | 'REVOGACAO'
  termo: string
  registrado_em: string
  registrado_por: { id: number; nome: string }
}
