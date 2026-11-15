import type { AdicaoItemOrcamentoDto } from "./adicaoItemOrcamentoDto.ts";


export interface CadastroOrcamentoDto {
  paciente_id: number;
  dentista_id?: number | null;
  valido_ate?: string | null;
  itens: AdicaoItemOrcamentoDto[];
}
