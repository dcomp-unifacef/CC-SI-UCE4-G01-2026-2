import type { ResultadoContatoRetorno }
  from "../../../generated/prisma/client.ts";


export interface CreateContatoRetornoDto {
  paciente_id: number;
  resultado: ResultadoContatoRetorno;
  anotacao?: string | null;
}
