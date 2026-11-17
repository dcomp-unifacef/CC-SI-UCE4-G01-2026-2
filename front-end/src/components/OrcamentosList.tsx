import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { diaDoInstante, formatarDiaCivil } from '../utils/datas'
import { formatarReais } from '../utils/formatos'
import { PacienteBusca } from './PacienteBusca'
import { SITUACOES_ORCAMENTO } from '../types/Orcamento'
import type { OrcamentoResumo } from '../types/Orcamento'
import type { Paciente } from '../types/Paciente'
import type { Usuario } from '../types/Usuario'

type OrcamentosListProps = {
  usuario: Usuario
  onSessaoExpirada: () => void
}

type Resposta = {
  chave: string
  orcamentos: OrcamentoResumo[]
  erro: string
}

export function OrcamentosList({ usuario, onSessaoExpirada }: OrcamentosListProps) {
  const clinico = usuario.perfil !== 'SECRETARIA'

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [situacao, setSituacao] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)

  const pacienteId = paciente?.id ?? null
  const chave = `${pacienteId}|${situacao}|${tentativa}`
  const carregando =
    pacienteId !== null && (resposta === null || resposta.chave !== chave)

  useEffect(() => {
    if (pacienteId === null) {
      return
    }

    let ativo = true

    const filtro = situacao === '' ? '' : `&situacao=${situacao}`

    chamarApi<OrcamentoResumo[]>(`/orcamentos?paciente_id=${pacienteId}${filtro}`)
      .then((lista) => {
        if (ativo) {
          setResposta({ chave, orcamentos: lista, erro: '' })
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
          orcamentos: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar os orçamentos. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [chave, pacienteId, situacao, onSessaoExpirada])

  const mostrar = pacienteId !== null && !carregando && resposta !== null
  const orcamentos = mostrar ? resposta.orcamentos : []
  const erro = mostrar ? resposta.erro : ''

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Orçamentos</h2>

        {clinico && (
          <Link to="/orcamentos/novo" className="btn btn-primary btn-sm">
            Novo orçamento
          </Link>
        )}
      </div>

      <PacienteBusca
        incluirDesativados
        onSelecionar={setPaciente}
        onSessaoExpirada={onSessaoExpirada}
      />

      {pacienteId !== null && (
        <div className="row g-2 my-2">
          <div className="col-12 col-md-3">
            <label htmlFor="situacao" className="form-label">
              Situação
            </label>
            <select
              id="situacao"
              className="form-select"
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="PENDENTE">Pendente</option>
              <option value="APROVADO">Aprovado</option>
              <option value="RECUSADO">Recusado</option>
            </select>
          </div>
        </div>
      )}

      {erro && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center mt-3"
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

      {carregando && <p className="text-secondary mt-3">Carregando...</p>}

      {mostrar && !erro && orcamentos.length === 0 && (
        <p className="text-secondary mt-3">Nenhum orçamento encontrado.</p>
      )}

      {mostrar && !erro && orcamentos.length > 0 && (
        <table className="table table-striped table-sm align-middle mt-3">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Criado em</th>
              <th>Dentista</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orcamentos.map((orcamento) => (
              <tr key={orcamento.id}>
                <td>{orcamento.id}</td>
                <td>{formatarDiaCivil(diaDoInstante(orcamento.criado_em))}</td>
                <td>{orcamento.dentista?.nome ?? '—'}</td>
                <td>{orcamento.quantidade_itens}</td>
                <td>{formatarReais(orcamento.total_centavos)}</td>
                <td>
                  <span
                    className={`badge ${SITUACOES_ORCAMENTO[orcamento.situacao].classe}`}
                  >
                    {SITUACOES_ORCAMENTO[orcamento.situacao].rotulo}
                  </span>
                </td>
                <td>
                  <Link
                    to={`/orcamentos/${orcamento.id}`}
                    className="btn btn-outline-primary btn-sm"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
