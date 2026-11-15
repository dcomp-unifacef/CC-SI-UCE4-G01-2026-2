import type { ConsultaRespostaDto } from "./consultaRespostaDto.ts";


export interface RealizacaoConsultaRespostaDto extends ConsultaRespostaDto {
  visita: { id: number; data_visita: string };
  retorno: { id: number; data_prevista: string };
}
