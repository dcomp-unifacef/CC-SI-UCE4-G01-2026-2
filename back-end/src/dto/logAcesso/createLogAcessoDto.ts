import type { TipoAcessoPaciente } from "../../../generated/prisma/client.ts";


export interface CreateLogAcessoDto {
  usuario_id: number;
  paciente_id: number;
  tipo: TipoAcessoPaciente;
}
