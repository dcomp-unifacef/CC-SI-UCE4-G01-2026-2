import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDiaCivil } from '../utils/datas'
import { PacienteBusca } from './PacienteBusca'
import type { Atraso } from '../types/Retorno'
import type { Paciente } from '../types/Paciente'
import type { Usuario } from '../types/Usuario'

type RetornosPainelProps = {
  usuario: Usuario
  onSessaoExpirada: () => void
}

type Resposta = {
  chave: string
  atrasos: Atraso[]
  erro: string
}

function descreverRetorno(atraso: Atraso): string {
  if (atraso.retorno !== null) {
    return `Previsto para ${formatarDiaCivil(atraso.retorno.data_prevista)}${
      atraso.retorno.vencido ? ' (vencido)' : ''
    }`
  }

  return atraso.retorno_descartado ? 'Retorno descartado' : 'Sem retorno'
}

export function RetornosPainel({ usuario, onSessaoExpirada }: RetornosPainelProps) {
  const clinico = usuario.perfil !== 'SECRETARIA'

  const [meses, setMeses] = useState('6')
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [paciente, setPaciente] = useState<Paciente | null>(null)

  const chave = `${meses}|${tentativa}`
  const carregando = resposta === null || resposta.chave !== chave

  useEffect(() => {
    let ativo = true

    chamarApi<Atraso[]>(`/retornos/atrasos?meses=${meses}`)
      .then((lista) => {
        if (ativo) {
          setResposta({ chave, atrasos: lista, erro: '' })
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
          atrasos: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar os pacientes em atraso. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [chave, meses, onSessaoExpirada])

  const atrasos = carregando ? [] : resposta.atrasos
  const erro = carregando ? '' : resposta.erro

  return (
    <>
      <h2 className="h5 mb-3">Retornos e contatos</h2>

      <div className="mb-4">
        <h3 className="h6">Consultar por paciente</h3>

        <PacienteBusca
          incluirDesativados
          onSelecionar={setPaciente}
          onSessaoExpirada={onSessaoExpirada}
        />

        {paciente !== null && (
          <div className="mt-2">
            <Link
              to={`/retornos/paciente/${paciente.id}`}
              className="btn btn-primary btn-sm"
            >
              Abrir retornos e contatos
            </Link>
          </div>
        )}
      </div>

      <h3 className="h6">Pacientes em atraso</h3>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-3">
          <label htmlFor="meses" className="form-label">
            Última visita há mais de
          </label>
          <select
            id="meses"
            className="form-select"
            value={meses}
            onChange={(e) => setMeses(e.target.value)}
          >
            <option value="6">6 meses</option>
            <option value="9">9 meses</option>
            <option value="12">12 meses</option>
          </select>
        </div>
      </div>

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

      {carregando && <p className="text-secondary">Carregando...</p>}

      {!carregando && !erro && atrasos.length === 0 && (
        <p className="text-secondary">Nenhum paciente em atraso.</p>
      )}

      {!carregando && !erro && atrasos.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Última visita</th>
              <th>Tempo</th>
              <th>Retorno</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {atrasos.map((atraso) => (
              <tr key={atraso.paciente.id}>
                <td>
                  {atraso.paciente.nome}
                  <br />
                  <small className="text-secondary">{atraso.paciente.telefone}</small>
                </td>
                <td>
                  {formatarDiaCivil(atraso.ultima_visita.data_visita)}
                  <br />
                  <small className="text-secondary">
                    {atraso.ultima_visita.dentista.nome}
                  </small>
                </td>
                <td>{atraso.meses_desde} meses</td>
                <td>{descreverRetorno(atraso)}</td>
                <td>
                  <div className="d-flex flex-wrap gap-1 justify-content-end">
                    <Link
                      to={`/retornos/paciente/${atraso.paciente.id}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Retornos e contatos
                    </Link>

                    {clinico && atraso.retorno === null && (
                      <Link
                        to={`/visitas/${atraso.ultima_visita.id}/retorno`}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Criar retorno
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
