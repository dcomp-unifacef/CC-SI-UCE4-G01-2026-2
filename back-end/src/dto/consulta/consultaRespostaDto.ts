import type { StatusConsulta } from "../../../generated/prisma/client.ts";


export interface ConsultaRespostaDto {
  id: number;
  paciente: { id: number; nome: string; telefone: string };
  dentista: { id: number; nome: string };
  inicio_em: Date;
  fim_em: Date;
  duracao_min: number;
  status: StatusConsulta;
  encaixe: boolean;
  criada_em: Date;
  atualizada_em: Date;
}
