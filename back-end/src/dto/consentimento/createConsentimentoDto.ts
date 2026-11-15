import type { AcaoConsentimento } from "../../../generated/prisma/client.ts";


export interface CreateConsentimentoDto {
  paciente_id: number;
  acao: AcaoConsentimento;
  termo: string;
}
