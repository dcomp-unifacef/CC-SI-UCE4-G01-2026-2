import type { TipoAcessoPaciente } from "../../../generated/prisma/client.ts";


export interface LogAcessoRespostaDto {
  id: number;
  tipo: TipoAcessoPaciente;
  acessado_em: Date;
  usuario: { id: number; nome: string };
  paciente: { id: number; nome: string };
}


export interface ListaLogAcessoRespostaDto {
  itens: LogAcessoRespostaDto[];
  proximo_cursor: number | null;
}
