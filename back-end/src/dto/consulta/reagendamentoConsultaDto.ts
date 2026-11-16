export interface ReagendamentoConsultaDto {
  inicio_em: string;
  duracao_min?: number;
  motivo_codigo: string;
  motivo?: string | null;
}
