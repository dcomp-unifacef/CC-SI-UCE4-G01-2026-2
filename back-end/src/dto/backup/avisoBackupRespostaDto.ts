import type { BackupRespostaDto } from "./backupRespostaDto.ts";


export interface AvisoBackupLoginDto {
  falhas_pendentes: number;
  backup_configurado: boolean | null;
  mensagem_configuracao?: string;
}


export interface AvisoBackupRespostaDto {
  configurada: boolean;
  motivo: string | null;
  falhas: BackupRespostaDto[];
  arquivos_ausentes: string[];
  arquivos_sem_registro: string[];
}
