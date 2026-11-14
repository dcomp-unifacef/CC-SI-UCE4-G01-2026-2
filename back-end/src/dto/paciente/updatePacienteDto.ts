// O CPF não faz parte deste DTO: ele não pode ser alterado (US06)
export interface UpdatePacienteDto {
  nome?: string;
  data_nascimento?: Date;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  telefone?: string;
  email?: string | null;
  ativo?: boolean;
}
