export interface UltimaVisitaRespostaDto {
  paciente_id: number;
  sem_historico: boolean;
  ultima_visita: {
    id: number;
    data_visita: string;
    dentista: { id: number; nome: string };
  } | null;
  dias_desde: number | null;
  meses_desde: number | null;
}
