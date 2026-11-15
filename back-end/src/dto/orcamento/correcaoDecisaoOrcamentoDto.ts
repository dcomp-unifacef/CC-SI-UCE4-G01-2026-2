import type { SituacaoDecididaOrcamento } from "./decisaoOrcamentoDto.ts";


export interface CorrecaoDecisaoOrcamentoDto {
  situacao: SituacaoDecididaOrcamento;
  motivo: string;
}
