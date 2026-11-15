export interface AlteracaoStatusConsultaDto {
  status: string;
  motivo?: string | null;
  procedimento?: string;
  observacoes?: string | null;
  retorno_meses?: number;
}
