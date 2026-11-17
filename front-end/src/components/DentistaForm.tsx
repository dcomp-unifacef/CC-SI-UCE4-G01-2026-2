import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import type { Dentista } from '../types/Dentista'

type DentistaFormProps = {
  dentista?: Dentista
  onSessaoExpirada: () => void
}

export function DentistaForm({ dentista, onSessaoExpirada }: DentistaFormProps) {
  const navigate = useNavigate()
  const edicao = dentista !== undefined

  const [nome, setNome] = useState(dentista?.nome ?? '')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      const salvo = await chamarApi<Dentista>(
        edicao ? `/dentistas/${dentista.id}` : '/dentistas',
        {
          method: edicao ? 'PATCH' : 'POST',
          body: JSON.stringify({ nome }),
        },
      )

      navigate(`/dentistas/${salvo.id}`)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(
        mensagemDoErro(
          e,
          edicao
            ? 'Não foi possível salvar o dentista.'
            : 'Não foi possível cadastrar o dentista.',
        ),
      )
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

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label htmlFor="nome" className="form-label">
            Nome
          </label>
          <input
            id="nome"
            className="form-control"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Salvando...' : edicao ? 'Salvar' : 'Cadastrar'}
        </button>
        <Link
          to={edicao ? `/dentistas/${dentista.id}` : '/dentistas'}
          className="btn btn-outline-secondary"
        >
          Voltar
        </Link>
      </div>
    </form>
  )
}
