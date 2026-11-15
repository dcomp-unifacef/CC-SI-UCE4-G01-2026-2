import type {
  OrigemBackup,
  SituacaoBackup,
} from "../../../generated/prisma/client.ts";


export interface BackupRespostaDto {
  id: number;
  origem: OrigemBackup;
  situacao: SituacaoBackup;
  data_referencia: string | null;
  iniciado_em: Date;
  finalizado_em: Date | null;
  arquivo: string | null;
  tamanho_bytes: number | null;
  sha256: string | null;
  arquivo_removido_em: Date | null;
  erro: string | null;
  solicitado_por: { id: number; nome: string } | null;
  aviso_visto_em: Date | null;
  aviso_visto_por_id: number | null;
}
