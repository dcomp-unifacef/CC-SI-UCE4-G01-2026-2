import type { OrigemBackup }
  from "../../../generated/prisma/client.ts";


export interface CreateBackupExecucaoDto {
  origem: OrigemBackup;
  data_referencia?: Date | null;
  solicitado_por_id?: number | null;
}
