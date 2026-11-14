export interface CreateConsultaDto {
  paciente_id: number;
  dentista_id: number;
  inicio_em: Date;
  duracao_min: number;
  encaixe?: boolean;
}
