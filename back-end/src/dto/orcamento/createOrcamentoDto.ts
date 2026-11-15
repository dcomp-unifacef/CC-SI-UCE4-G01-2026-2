import type { ItemOrcamentoEntradaDto } from "./itemOrcamentoEntradaDto.ts";


export interface CreateOrcamentoDto {
  paciente_id: number;
  dentista_id?: number | null;
  valido_ate?: Date | null;
  itens: ItemOrcamentoEntradaDto[];
}
