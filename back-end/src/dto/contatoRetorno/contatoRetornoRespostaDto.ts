import type { ResultadoContatoRetorno } from "../../../generated/prisma/client.ts";


export interface ContatoRetornoRespostaDto {
  id: number;
  paciente_id: number;
  resultado: ResultadoContatoRetorno;
  anotacao?: string | null;
  registrado_em: Date;
  usuario: { id: number; nome: string };
}
