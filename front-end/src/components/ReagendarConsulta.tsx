import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { diaDoInstante, formatarHora, montarInstante } from '../utils/datas'
import { CampoMotivo } from './CampoMotivo'
import type { Consulta } from '../types/Consulta'
import type { Usuario } from '../types/Usuario'

type ReagendarConsultaProps = {
  usuario: Usuario
  consulta: Consulta
  onSessaoExpirada: () => void
}

export function ReagendarConsulta({
  usuario,
  consulta,
  onSessaoExpirada,
}: ReagendarConsultaProps) {
  const navigate = useNavigate()
  const diaAtual = diaDoInstante(consulta.inicio_em)

  const [data, setData] = useState(diaAtual)
  const [hora, setHora] = useState(formatarHora(consulta.inicio_em))
  const [duracao, setDuracao] = useState(String(consulta.duracao_min))
  const [codigo, setCodigo] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    if (codigo === '') {
      setErro('Selecione o motivo do reagendamento.')
      return
    }

    const inicio = montarInstante(data, hora)

    if (inicio === null) {
      setErro('Informe a nova data e a nova hora.')
      return
    }

    const corpo: Record<string, string | number> = {
      inicio_em: inicio,
      duracao_min: Number(duracao),
      motivo_codigo: codigo,
    }

    if (usuario.perfil === 'DONO' && texto.trim() !== '') {
      corpo.motivo = texto.trim()
    }

    setEnviando(true)

    try {
      await chamarApi<Consulta>(`/consultas/${consulta.id}/horario`, {
        method: 'PATCH',
        body: JSON.stringify(corpo),
      })

      navigate(`/agenda?dia=${data}`)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível reagendar a consulta.'))
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar}>
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <div className="row g-3">
        <div className="col-6 col-md-3">
          <label htmlFor="data" className="form-label">
            Nova data
          </label>
          <input
            id="data"
            className="form-control"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>

        <div className="col-6 col-md-3">
          <label htmlFor="hora" className="form-label">
            Nova hora
          </label>
          <input
            id="hora"
            className="form-control"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            required
          />
        </div>

        <div className="col-6 col-md-3">
          <label htmlFor="duracao" className="form-label">
            Duração (min)
          </label>
          <input
            id="duracao"
            className="form-control"
            type="number"
            min="1"
            step="1"
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            required
          />
        </div>

        <CampoMotivo
          codigo={codigo}
          texto={texto}
          mostrarTexto={usuario.perfil === 'DONO'}
          onCodigo={setCodigo}
          onTexto={setTexto}
        />
      </div>

      <div className="mt-3 d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? 'Reagendando...' : 'Reagendar'}
        </button>
        <Link to={`/agenda?dia=${diaAtual}`} className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>
    </form>
  )
}
