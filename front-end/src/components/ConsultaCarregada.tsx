import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDataHora, formatarHora } from '../utils/datas'
import { SITUACOES } from '../types/Consulta'
import type { Consulta } from '../types/Consulta'

type ConsultaCarregadaProps = {
  titulo: string
  onSessaoExpirada: () => void
  children: (consulta: Consulta) => ReactNode
}

type Estado = {
  id: string
  consulta: Consulta | null
  erro: string
}

export function ConsultaCarregada({
  titulo,
  onSessaoExpirada,
  children,
}: ConsultaCarregadaProps) {
  const { id = '' } = useParams()
  const [estado, setEstado] = useState<Estado | null>(null)

  useEffect(() => {
    let ativo = true

    chamarApi<Consulta>(`/consultas/${id}`)
      .then((consulta) => {
        if (ativo) {
          setEstado({ id, consulta, erro: '' })
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

        setEstado({
          id,
          consulta: null,
          erro: mensagemDoErro(e, 'Não foi possível carregar a consulta.'),
        })
      })

    return () => {
      ativo = false
    }
  }, [id, onSessaoExpirada])

  const carregando = estado === null || estado.id !== id
  const consulta = carregando ? null : estado.consulta
  const erro = carregando ? '' : estado.erro

  return (
    <>
      <h2 className="h5 mb-3">{titulo}</h2>

      {carregando && <p className="text-secondary">Carregando...</p>}

      {erro && (
        <>
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
          <Link to="/agenda" className="btn btn-outline-secondary">
            Voltar à agenda
          </Link>
        </>
      )}

      {consulta && (
        <>
          <dl className="row">
            <dt className="col-sm-2">Paciente</dt>
            <dd className="col-sm-10">{consulta.paciente.nome}</dd>
            <dt className="col-sm-2">Dentista</dt>
            <dd className="col-sm-10">{consulta.dentista.nome}</dd>
            <dt className="col-sm-2">Horário</dt>
            <dd className="col-sm-10">
              {formatarDataHora(consulta.inicio_em)} –{' '}
              {formatarHora(consulta.fim_em)}
            </dd>
            <dt className="col-sm-2">Situação</dt>
            <dd className="col-sm-10">
              <span className={`badge ${SITUACOES[consulta.status].classe}`}>
                {SITUACOES[consulta.status].rotulo}
              </span>
            </dd>
          </dl>

          {children(consulta)}
        </>
      )}
    </>
  )
}
