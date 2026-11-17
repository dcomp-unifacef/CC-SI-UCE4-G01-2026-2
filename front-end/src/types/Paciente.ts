export type Paciente = {
  id: number
  nome: string
  cpf: string
  data_nascimento: string
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  municipio: string | null
  uf: string | null
  telefone: string
  email: string | null
  ativo: boolean
}

export type PacienteComConsentimento = Paciente & {
  consentimento: {
    situacao: 'SEM_REGISTRO' | 'CONCEDIDO' | 'REVOGADO'
    termo: string | null
    registrado_em: string | null
    registrado_por: { id: number; nome: string } | null
  }
}
