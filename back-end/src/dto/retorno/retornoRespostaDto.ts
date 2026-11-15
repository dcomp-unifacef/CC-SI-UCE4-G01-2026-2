import type { SituacaoRetorno } from "../../../generated/prisma/client.ts";


export interface RetornoRespostaDto {
  id: number;
  paciente: { id: number; nome: string; telefone: string };
  visita_origem: { id: number; data_visita: string; dentista_id: number };
  data_prevista: string;
  situacao: SituacaoRetorno;
  criado_em: Date;
  encerrado_em: Date | null;
  encerrado_por_id: number | null;
  motivo_descarte?: string | null;
}
