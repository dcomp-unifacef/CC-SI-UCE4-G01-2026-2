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
