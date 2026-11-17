export type Backup = {
  id: number
  origem: 'AGENDADO' | 'MANUAL'
  situacao: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'FALHOU'
  data_referencia: string | null
  iniciado_em: string
  finalizado_em: string | null
  arquivo: string | null
  tamanho_bytes: number | null
  sha256: string | null
  arquivo_removido_em: string | null
  erro: string | null
  solicitado_por: { id: number; nome: string } | null
  aviso_visto_em: string | null
  aviso_visto_por_id: number | null
}

export type AvisoBackup = {
  configurada: boolean
  motivo: string | null
  falhas: Backup[]
  arquivos_ausentes: string[]
  arquivos_sem_registro: string[]
}
