ALTER TABLE "HistoricoConsulta"
  ADD CONSTRAINT "HistoricoConsulta_motivo_codigo_obrigatorio"
  CHECK (
    (tipo <> 'REAGENDAMENTO' AND NOT (tipo = 'MUDANCA_DE_STATUS' AND status_novo = 'CANCELADA'))
    OR motivo_codigo IS NOT NULL
  ) NOT VALID;