import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { hoje, montarInstante } from '../utils/datas'
import type { Consulta } from '../types/Consulta'
import type { Dentista } from '../types/Dentista'
import type { Paciente } from '../types/Paciente'

type ConsultaFormProps = {
  onSessaoExpirada: () => void
}

export function ConsultaForm({ onSessaoExpirada }: ConsultaFormProps) {
  const navigate = useNavigate()
  const [parametros] = useSearchParams()

  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [mensagemBusca, setMensagemBusca] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [dentistas, setDentistas] = useState<Dentista[]>([])
  const [dentistaId, setDentistaId] = useState('')
  const [data, setData] = useState(parametros.get('dia') ?? hoje())
  const [hora, setHora] = useState('')
  const [duracao, setDuracao] = useState('30')
  const [encaixe, setEncaixe] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  function tratar(e: unknown, padrao: string) {
    if (e instanceof ErroApi && e.status === 401) {
      onSessaoExpirada()
      return
    }

    setErro(mensagemDoErro(e, padrao))
  }

  useEffect(() => {
    chamarApi<Dentista[]>('/dentistas')
      .then((lista) => setDentistas(lista.filter((dentista) => dentista.ativo)))
      .catch((e) => {
        if (e instanceof ErroApi && e.status === 401) {
          onSessaoExpirada()
          return
        }

        setErro(mensagemDoErro(e, 'Não foi possível carregar os dentistas.'))
      })
  }, [onSessaoExpirada])

  async function buscar() {
    const termo = busca.trim()

    if (termo === '') {
      setMensagemBusca('Digite o nome do paciente para buscar.')
      return
    }

    setBuscando(true)
    setMensagemBusca('')
    setErro('')

    try {
      const lista = await chamarApi<Paciente[]>(
        `/pacientes?busca=${encodeURIComponent(termo)}`,
      )

      setPacientes(lista)
      setPacienteId(lista.length > 0 ? String(lista[0].id) : '')

      if (lista.length === 0) {
        setMensagemBusca('Nenhum paciente encontrado.')
      }
    }
    catch (e) {
      tratar(e, 'Não foi possível buscar os pacientes. Tente novamente.')
    }
    finally {
      setBuscando(false)
    }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    if (pacienteId === '') {
      setErro('Busque e selecione o paciente.')
      return
    }

    if (dentistaId === '') {
      setErro('Selecione o dentista.')
      return
    }

    const inicio = montarInstante(data, hora)

    if (inicio === null) {
      setErro('Informe a data e a hora.')
      return
    }

    setEnviando(true)

    try {
      await chamarApi<Consulta>('/consultas', {
        method: 'POST',
        body: JSON.stringify({
          paciente_id: Number(pacienteId),
          dentista_id: Number(dentistaId),
          inicio_em: inicio,
          duracao_min: Number(duracao),
          encaixe,
        }),
      })

      navigate(`/agenda?dia=${data}`)
    }
    catch (e) {
      tratar(e, 'Não foi possível marcar a consulta. Tente novamente.')
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <h2 className="h5 mb-3">Nova consulta</h2>

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <form onSubmit={enviar}>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label htmlFor="busca" className="form-label">
              Paciente
            </label>
            <div className="input-group">
              <input
                id="busca"
                className="form-control"
                type="text"
                placeholder="Nome do paciente"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    buscar()
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={buscando}
                onClick={buscar}
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {mensagemBusca && (
              <div className="form-text">{mensagemBusca}</div>
            )}
          </div>

          <div className="col-12 col-md-6">
            <label htmlFor="paciente" className="form-label">
              Resultado da busca
            </label>
            <select
              id="paciente"
              className="form-select"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
              disabled={pacientes.length === 0}
            >
              {pacientes.length === 0 && (
                <option value="">Busque um paciente</option>
              )}
              {pacientes.map((paciente) => (
                <option key={paciente.id} value={paciente.id}>
                  {paciente.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label htmlFor="dentista" className="form-label">
              Dentista
            </label>
            <select
              id="dentista"
              className="form-select"
              value={dentistaId}
              onChange={(e) => setDentistaId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {dentistas.map((dentista) => (
                <option key={dentista.id} value={dentista.id}>
                  {dentista.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label htmlFor="data" className="form-label">
              Data
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

          <div className="col-6 col-md-2">
            <label htmlFor="hora" className="form-label">
              Hora
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

          <div className="col-6 col-md-2">
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

          <div className="col-12">
            <div className="form-check">
              <input
                id="encaixe"
                className="form-check-input"
                type="checkbox"
                checked={encaixe}
                onChange={(e) => setEncaixe(e.target.checked)}
              />
              <label htmlFor="encaixe" className="form-check-label">
                Encaixe (atendimento imediato)
              </label>
            </div>
          </div>
        </div>

        <div className="mt-3 d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Marcando...' : 'Marcar consulta'}
          </button>
          <Link to={`/agenda?dia=${data}`} className="btn btn-outline-secondary">
            Voltar
          </Link>
        </div>
      </form>
    </>
  )
}
