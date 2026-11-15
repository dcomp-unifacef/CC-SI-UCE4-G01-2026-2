import type { OrcamentoRespostaDto } from "./orcamentoRespostaDto.ts";


export interface OrcamentoResumoRespostaDto
  extends Omit<OrcamentoRespostaDto, "itens"> {
  quantidade_itens: number;
}
