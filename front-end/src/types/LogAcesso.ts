export type LogAcesso = {
  id: number
  tipo: string
  acessado_em: string
  usuario: { id: number; nome: string }
  paciente: { id: number; nome: string }
}

export type ListaLogAcesso = {
  itens: LogAcesso[]
  proximo_cursor: number | null
}
