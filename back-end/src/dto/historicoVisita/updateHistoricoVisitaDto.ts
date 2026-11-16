export interface UpdateHistoricoVisitaDto {
  data_visita?: Date;
  procedimento?: string;
  procedimento_id?: number | null;
  dentista_id?: number;
  observacoes?: string | null;
  paciente_id?: number;
}
