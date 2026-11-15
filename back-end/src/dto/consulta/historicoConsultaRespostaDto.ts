import type {
  StatusConsulta,
  TipoHistoricoConsulta,
} from "../../../generated/prisma/client.ts";


export interface HistoricoConsultaRespostaDto {
  id: number;
  tipo: TipoHistoricoConsulta;
  status_anterior: StatusConsulta | null;
  status_novo: StatusConsulta;
  inicio_anterior: Date | null;
  inicio_novo: Date | null;
  duracao_anterior_min: number | null;
  duracao_nova_min: number | null;
  motivo: string | null;
  registrado_em: Date;
  usuario: { id: number; nome: string };
}
