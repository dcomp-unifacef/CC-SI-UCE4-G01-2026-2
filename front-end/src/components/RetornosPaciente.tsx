import { Fragment, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDataHora, formatarDiaCivil, hoje } from '../utils/datas'
import { ContatoForm } from './ContatoForm'
import { RESULTADOS, SITUACOES_RETORNO, TIPOS_HISTORICO } from '../types/Retorno'
import type { Contato, HistoricoRetorno, Retorno } from '../types/Retorno'
import type { Paciente } from '../types/Paciente'
import type { Usuario } from '../types/Usuario'

type RetornosPacienteProps = {
  usuario: Usuario
  onSessaoExpirada: () => void
}

type Resposta = {
  chave: string
  paciente: Paciente | null
  retornos: Retorno[]
  contatos: Contato[]
  erro: string
}

type Historico = {
  retornoId: number
  itens: HistoricoRetorno[]
  erro: string
}

export function RetornosPaciente({
  usuario,
  onSessaoExpirada,
}: RetornosPacienteProps) {
  const { id = '' } = useParams()
  const clinico = usuario.perfil !== 'SECRETARIA'
  const dono = usuario.perfil === 'DONO'
  const registraContato = usuario.perfil !== 'DENTISTA'

  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [historico, setHistorico] = useState<Historico | null>(null)

  const chave = `${id}|${tentativa}`
  const carregando = resposta === null || resposta.chave !== chave

  useEffect(() => {
    let ativo = true

    Promise.all([
      chamarApi<Paciente>(`/pacientes/${id}`),
      chamarApi<Retorno[]>(`/retornos?paciente_id=${id}`),
      chamarApi<Contato[]>(`/contatos-retorno?paciente_id=${id}`),
    ])
      .then(([paciente, retornos, contatos]) => {
        if (ativo) {
          setResposta({ chave, paciente, retornos, contatos, erro: '' })
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
          paciente: null,
          retornos: [],
          contatos: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar os retornos e contatos.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [chave, id, onSessaoExpirada])

  async function verHistorico(retornoId: number) {
    if (historico !== null && historico.retornoId === retornoId) {
      setHistorico(null)
      return
    }

    try {
      const itens = await chamarApi<HistoricoRetorno[]>(
        `/retornos/${retornoId}/historico`,
      )

      setHistorico({ retornoId, itens, erro: '' })
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setHistorico({
        retornoId,
        itens: [],
        erro: mensagemDoErro(e, 'Não foi possível carregar o histórico.'),
      })
    }
  }

  const dia = hoje()
  const paciente = carregando ? null : resposta.paciente
  const retornos = carregando ? [] : resposta.retornos
  const contatos = carregando ? [] : resposta.contatos
  const erro = carregando ? '' : resposta.erro

  return (
    <>
      <h2 className="h5 mb-3">
        Retornos e contatos{paciente !== null && ` — ${paciente.nome}`}
      </h2>

      {carregando && <p className="text-secondary">Carregando...</p>}

      {erro && (
        <>
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
          <Link to="/retornos" className="btn btn-outline-secondary">
            Voltar
          </Link>
        </>
      )}

      {paciente !== null && (
        <>
          <h3 className="h6">Retornos</h3>

          {retornos.length === 0 && (
            <p className="text-secondary">Nenhum retorno registrado.</p>
          )}

          {retornos.length > 0 && (
            <table className="table table-striped table-sm align-middle">
              <thead>
                <tr>
                  <th>Previsto para</th>
                  <th>Situação</th>
                  <th>Visita de origem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {retornos.map((retorno) => (
                  <Fragment key={retorno.id}>
                    <tr>
                      <td>{formatarDiaCivil(retorno.data_prevista)}</td>
                      <td>
                        <span
                          className={`badge ${SITUACOES_RETORNO[retorno.situacao].classe}`}
                        >
                          {SITUACOES_RETORNO[retorno.situacao].rotulo}
                        </span>
                        {retorno.situacao === 'ABERTO' &&
                          retorno.data_prevista.slice(0, 10) < dia && (
                            <span className="badge text-bg-light border ms-1">
                              Vencido
                            </span>
                          )}
                        {retorno.situacao === 'DESCARTADO' &&
                          retorno.motivo_descarte != null && (
                            <div>
                              <small className="text-secondary">
                                Motivo: {retorno.motivo_descarte}
                              </small>
                            </div>
                          )}
                      </td>
                      <td>{formatarDiaCivil(retorno.visita_origem.data_visita)}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1 justify-content-end">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => verHistorico(retorno.id)}
                          >
                            Histórico
                          </button>

                          {clinico && retorno.situacao === 'ABERTO' && (
                            <Link
                              to={`/retornos/${retorno.id}/corrigir`}
                              className="btn btn-outline-secondary btn-sm"
                            >
                              Corrigir data
                            </Link>
                          )}

                          {dono && retorno.situacao === 'ABERTO' && (
                            <Link
                              to={`/retornos/${retorno.id}/descartar`}
                              className="btn btn-outline-danger btn-sm"
                            >
                              Descartar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>

                    {historico !== null && historico.retornoId === retorno.id && (
                      <tr>
                        <td colSpan={4}>
                          {historico.erro && (
                            <div className="alert alert-danger mb-0" role="alert">
                              {historico.erro}
                            </div>
                          )}

                          {historico.itens.map((item) => (
                            <div key={item.id}>
                              {formatarDataHora(item.registrado_em)} —{' '}
                              {TIPOS_HISTORICO[item.tipo]} por {item.usuario.nome}
                              {item.data_anterior !== null &&
                                item.data_nova !== null &&
                                ` (${formatarDiaCivil(item.data_anterior)} → ${formatarDiaCivil(item.data_nova)})`}
                              {item.motivo != null && ` — ${item.motivo}`}
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}

          <h3 className="h6 mt-4">Contatos</h3>

          {contatos.length === 0 && (
            <p className="text-secondary">Nenhum contato registrado.</p>
          )}

          {contatos.length > 0 && (
            <table className="table table-striped table-sm align-middle">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Resultado</th>
                  <th>Registrado por</th>
                  {clinico && <th>Anotação</th>}
                </tr>
              </thead>
              <tbody>
                {contatos.map((contato) => (
                  <tr key={contato.id}>
                    <td>{formatarDataHora(contato.registrado_em)}</td>
                    <td>{RESULTADOS[contato.resultado]}</td>
                    <td>{contato.usuario.nome}</td>
                    {clinico && <td>{contato.anotacao ?? '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {registraContato && (
            <div className="mt-3">
              <ContatoForm
                usuario={usuario}
                pacienteId={paciente.id}
                onRegistrado={() => setTentativa(tentativa + 1)}
                onSessaoExpirada={onSessaoExpirada}
              />
            </div>
          )}

          <div className="mt-3">
            <Link to="/retornos" className="btn btn-outline-secondary">
              Voltar
            </Link>
          </div>
        </>
      )}
    </>
  )
}
