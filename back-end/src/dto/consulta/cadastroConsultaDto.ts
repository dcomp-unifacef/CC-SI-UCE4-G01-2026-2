export interface CadastroConsultaDto {
  paciente_id: number;
  dentista_id: number;
  inicio_em: string;
  duracao_min: number;
  encaixe?: boolean;
}
