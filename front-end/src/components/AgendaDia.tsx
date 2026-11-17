import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarHora, hoje } from '../utils/datas'
import type { Consulta, StatusConsulta } from '../types/Consulta'
import type { Dentista } from '../types/Dentista'
import type { Usuario } from '../types/Usuario'

type AgendaDiaProps = {
  usuario: Usuario
  onSessaoExpirada: () => void
}

type Resposta = {
  chave: string
  consultas: Consulta[]
  erro: string
}

const SITUACOES: Record<StatusConsulta, { rotulo: string; classe: string }> = {
  AGENDADA: { rotulo: 'Agendada', classe: 'text-bg-primary' },
  CONFIRMADA: { rotulo: 'Confirmada', classe: 'text-bg-success' },
  REALIZADA: { rotulo: 'Realizada', classe: 'text-bg-secondary' },
  FALTOU: { rotulo: 'Faltou', classe: 'text-bg-warning' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'text-bg-danger' },
}

export function AgendaDia({ usuario, onSessaoExpirada }: AgendaDiaProps) {
  const [parametros] = useSearchParams()
  const [dia, setDia] = useState(parametros.get('dia') ?? hoje())

  const [dentistas, setDentistas] = useState<Dentista[]>([])
  const [dentistaId, setDentistaId] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [aviso, setAviso] = useState('')
  const [confirmando, setConfirmando] = useState<number | null>(null)

  const diaValido = /^\d{4}-\d{2}-\d{2}$/.test(dia) && dia >= '2000-01-01'
  const chave = `${dia}|${dentistaId}|${tentativa}`
  const carregando =
    diaValido && (resposta === null || resposta.chave !== chave)

  useEffect(() => {
    chamarApi<Dentista[]>('/dentistas')
      .then((lista) => setDentistas(lista.filter((dentista) => dentista.ativo)))
      .catch((e) => {
        if (e instanceof ErroApi && e.status === 401) {
          onSessaoExpirada()
          return
        }

        setAviso(mensagemDoErro(e, 'Não foi possível carregar os dentistas.'))
      })
  }, [onSessaoExpirada])

  useEffect(() => {
    if (!diaValido) {
      return
    }

    let ativo = true

    const filtro = dentistaId === '' ? '' : `&dentista_id=${dentistaId}`

    chamarApi<Consulta[]>(`/consultas?dia=${dia}${filtro}`)
      .then((lista) => {
        if (ativo) {
          setResposta({
            chave,
            consultas: [...lista].sort((a, b) =>
              a.inicio_em.localeCompare(b.inicio_em),
            ),
            erro: '',
          })
        }
      })
      .catch((e) => {
        if (!ativo) {
          return
        }

        if (e instanceof ErroApi && e.status === 401) {
          onSessaoExpirada()
          return
        }

        setResposta({
          chave,
          consultas: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar a agenda. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [chave, dia, diaValido, dentistaId, onSessaoExpirada])

  async function confirmar(consulta: Consulta) {
    setConfirmando(consulta.id)
    setAviso('')

    try {
      const atualizada = await chamarApi<Consulta>(
        `/consultas/${consulta.id}/status`,
        { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMADA' }) },
      )

      setResposta((atual) =>
        atual === null
          ? atual
          : {
              ...atual,
              consultas: atual.consultas.map((item) =>
                item.id === atualizada.id ? atualizada : item,
              ),
            },
      )
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setAviso(mensagemDoErro(e, 'Não foi possível confirmar a consulta.'))
    }
    finally {
      setConfirmando(null)
    }
  }

  const consultas = diaValido && resposta !== null ? resposta.consultas : []
  const erro =
    diaValido && resposta !== null && resposta.chave === chave
      ? resposta.erro
      : ''

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Agenda do dia</h2>

        {usuario.perfil !== 'DENTISTA' && (
          <Link
            to={`/agenda/nova?dia=${diaValido ? dia : hoje()}`}
            className="btn btn-primary btn-sm"
          >
            Nova consulta
          </Link>
        )}
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-3">
          <label htmlFor="dia" className="form-label">
            Dia
          </label>
          <input
            id="dia"
            className="form-control"
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-4">
          <label htmlFor="dentista" className="form-label">
            Dentista
          </label>
          <select
            id="dentista"
            className="form-select"
            value={dentistaId}
            onChange={(e) => setDentistaId(e.target.value)}
          >
            <option value="">Todos</option>
            {dentistas.map((dentista) => (
              <option key={dentista.id} value={dentista.id}>
                {dentista.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {aviso && (
        <div className="alert alert-warning" role="alert">
          {aviso}
        </div>
      )}

      {erro && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{erro}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => setTentativa(tentativa + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!diaValido && (
        <p className="text-secondary">Informe uma data válida.</p>
      )}

      {carregando && <p className="text-secondary">Carregando...</p>}

      {diaValido && !carregando && !erro && consultas.length === 0 && (
        <p className="text-secondary">Nenhuma consulta neste dia.</p>
      )}

      {diaValido && !carregando && !erro && consultas.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Horário</th>
              <th>Paciente</th>
              <th>Dentista</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {consultas.map((consulta) => (
              <tr key={consulta.id}>
                <td>
                  {formatarHora(consulta.inicio_em)} –{' '}
                  {formatarHora(consulta.fim_em)}
                </td>
                <td>{consulta.paciente.nome}</td>
                <td>{consulta.dentista.nome}</td>
                <td>
                  <span
                    className={`badge ${SITUACOES[consulta.status].classe}`}
                  >
                    {SITUACOES[consulta.status].rotulo}
                  </span>
                  {consulta.encaixe && (
                    <span className="badge text-bg-light border ms-1">
                      Encaixe
                    </span>
                  )}
                </td>
                <td className="text-end">
                  {consulta.status === 'AGENDADA' && (
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      disabled={confirmando === consulta.id}
                      onClick={() => confirmar(consulta)}
                    >
                      {confirmando === consulta.id
                        ? 'Confirmando...'
                        : 'Confirmar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
