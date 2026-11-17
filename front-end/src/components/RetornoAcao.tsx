import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDiaCivil } from '../utils/datas'
import type { Retorno } from '../types/Retorno'
import type { Visita } from '../types/Visita'

type RetornoAcaoProps =
  | { modo: 'criar'; visita: Visita; onSessaoExpirada: () => void }
  | {
      modo: 'corrigir' | 'descartar'
      retorno: Retorno
      onSessaoExpirada: () => void
    }

export function RetornoAcao(props: RetornoAcaoProps) {
  const navigate = useNavigate()

  const pacienteId =
    props.modo === 'criar' ? props.visita.paciente_id : props.retorno.paciente.id

  const [data, setData] = useState(
    props.modo === 'corrigir' ? props.retorno.data_prevista.slice(0, 10) : '',
  )
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      if (props.modo === 'criar') {
        await chamarApi<Retorno>('/retornos', {
          method: 'POST',
          body: JSON.stringify({
            visita_origem_id: props.visita.id,
            data_prevista: data,
          }),
        })
      }
      else if (props.modo === 'corrigir') {
        await chamarApi<Retorno>(`/retornos/${props.retorno.id}/data`, {
          method: 'PATCH',
          body: JSON.stringify({ data_prevista: data, motivo }),
        })
      }
      else {
        await chamarApi<Retorno>(`/retornos/${props.retorno.id}/descarte`, {
          method: 'POST',
          body: JSON.stringify({ motivo }),
        })
      }

      navigate(`/retornos/paciente/${pacienteId}`)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        props.onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível concluir a operação.'))
    }
    finally {
      setEnviando(false)
    }
  }

  const rotulo = {
    criar: 'Criar retorno',
    corrigir: 'Corrigir data',
    descartar: 'Descartar retorno',
  }[props.modo]

  return (
    <form onSubmit={enviar} noValidate>
      {props.modo === 'criar' && (
        <p>
          Visita de {formatarDiaCivil(props.visita.data_visita)} —{' '}
          {props.visita.paciente.nome}
        </p>
      )}

      {props.modo !== 'criar' && (
        <p>
          {props.retorno.paciente.nome} — retorno previsto para{' '}
          {formatarDiaCivil(props.retorno.data_prevista)}
        </p>
      )}

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <div className="row g-3">
        {props.modo !== 'descartar' && (
          <div className="col-12 col-md-3">
            <label htmlFor="data" className="form-label">
              Data prevista
            </label>
            <input
              id="data"
              className="form-control"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
        )}

        {props.modo !== 'criar' && (
          <div className="col-12 col-md-6">
            <label htmlFor="motivo" className="form-label">
              Motivo
            </label>
            <input
              id="motivo"
              className="form-control"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="mt-3 d-flex gap-2">
        <button
          type="submit"
          className={props.modo === 'descartar' ? 'btn btn-danger' : 'btn btn-primary'}
          disabled={enviando}
        >
          {enviando ? 'Salvando...' : rotulo}
        </button>
        <Link
          to={`/retornos/paciente/${pacienteId}`}
          className="btn btn-outline-secondary"
        >
          Voltar
        </Link>
      </div>
    </form>
  )
}
