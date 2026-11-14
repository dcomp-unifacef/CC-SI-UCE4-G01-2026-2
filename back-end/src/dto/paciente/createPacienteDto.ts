export interface CreatePacienteDto {
  nome: string;
  cpf: string;
  data_nascimento: Date;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  telefone: string;
  email?: string | null;
}
