import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { RESULTADOS } from '../types/Retorno'
import type { Contato, ResultadoContato } from '../types/Retorno'
import type { Usuario } from '../types/Usuario'

type ContatoFormProps = {
  usuario: Usuario
  pacienteId: number
  onRegistrado: () => void
  onSessaoExpirada: () => void
}

export function ContatoForm({
  usuario,
  pacienteId,
  onRegistrado,
  onSessaoExpirada,
}: ContatoFormProps) {
  const [resultado, setResultado] = useState('')
  const [anotacao, setAnotacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    const corpo: Record<string, unknown> = {
      paciente_id: pacienteId,
      resultado,
    }

    if (usuario.perfil === 'DONO' && anotacao.trim() !== '') {
      corpo.anotacao = anotacao.trim()
    }

    setEnviando(true)

    try {
      await chamarApi<Contato>('/contatos-retorno', {
        method: 'POST',
        body: JSON.stringify(corpo),
      })

      setResultado('')
      setAnotacao('')
      onRegistrado()
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível registrar o contato.'))
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <div className="row g-2">
        <div className="col-12 col-md-4">
          <label htmlFor="resultado" className="form-label">
            Resultado do contato
          </label>
          <select
            id="resultado"
            className="form-select"
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
          >
            <option value="">Selecione</option>
            {(Object.keys(RESULTADOS) as ResultadoContato[]).map((codigo) => (
              <option key={codigo} value={codigo}>
                {RESULTADOS[codigo]}
              </option>
            ))}
          </select>
        </div>

        {usuario.perfil === 'DONO' && (
          <div className="col-12 col-md-8">
            <label htmlFor="anotacao" className="form-label">
              Anotação (opcional)
            </label>
            <textarea
              id="anotacao"
              className="form-control"
              rows={2}
              value={anotacao}
              onChange={(e) => setAnotacao(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="mt-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
          {enviando ? 'Registrando...' : 'Registrar contato'}
        </button>
      </div>
    </form>
  )
}
