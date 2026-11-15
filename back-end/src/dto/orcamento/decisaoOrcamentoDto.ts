import type { SituacaoOrcamento } from "../../../generated/prisma/client.ts";


export type SituacaoDecididaOrcamento = Exclude<SituacaoOrcamento, "PENDENTE">;


export interface DecisaoOrcamentoDto {
  situacao: SituacaoDecididaOrcamento;
  motivo?: string | null;
}
