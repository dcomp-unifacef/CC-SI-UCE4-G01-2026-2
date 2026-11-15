import type { AcaoConsentimento } from "../../../generated/prisma/client.ts";


export interface ConsentimentoRespostaDto {
  id: number;
  paciente_id: number;
  acao: AcaoConsentimento;
  termo: string;
  registrado_em: Date;
  registrado_por: { id: number; nome: string };
}
