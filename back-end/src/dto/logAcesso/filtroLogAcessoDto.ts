import type { TipoAcessoPaciente } from "../../../generated/prisma/client.ts";


export interface FiltroLogAcessoDto {
  paciente_id?: number;
  usuario_id?: number;
  tipo?: TipoAcessoPaciente;
  de?: Date;
  ate?: Date;
  antes_do_id?: number;
  limite: number;
}
