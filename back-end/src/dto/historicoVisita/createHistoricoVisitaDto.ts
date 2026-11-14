export interface CreateHistoricoVisitaDto {
  data_visita: Date;
  procedimento: string;
  dentista_id: number;
  observacoes?: string | null;
  paciente_id: number;
}
