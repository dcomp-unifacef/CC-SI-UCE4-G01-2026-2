import { MOTIVOS } from '../types/Motivo'

type CampoMotivoProps = {
  codigo: string
  texto: string
  mostrarTexto: boolean
  onCodigo: (codigo: string) => void
  onTexto: (texto: string) => void
}

export function CampoMotivo({
  codigo,
  texto,
  mostrarTexto,
  onCodigo,
  onTexto,
}: CampoMotivoProps) {
  return (
    <>
      <div className="col-12 col-md-6">
        <label htmlFor="motivo" className="form-label">
          Motivo
        </label>
        <select
          id="motivo"
          className="form-select"
          value={codigo}
          onChange={(e) => onCodigo(e.target.value)}
          required
        >
          <option value="">Selecione</option>
          {MOTIVOS.map((motivo) => (
            <option key={motivo.codigo} value={motivo.codigo}>
              {motivo.rotulo}
            </option>
          ))}
        </select>
      </div>

      {mostrarTexto && (
        <div className="col-12">
          <label htmlFor="motivo-texto" className="form-label">
            Observação do motivo (opcional)
          </label>
          <textarea
            id="motivo-texto"
            className="form-control"
            rows={2}
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
          />
        </div>
      )}
    </>
  )
}
