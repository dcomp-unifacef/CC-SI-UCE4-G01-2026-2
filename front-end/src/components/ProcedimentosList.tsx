import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarReais } from '../utils/formatos'
import type { Procedimento } from '../types/Procedimento'
import type { Usuario } from '../types/Usuario'

type ProcedimentosListProps = {
  usuario: Usuario
  onSessaoExpirada: () => void
}

type Resposta = {
  tentativa: number
  procedimentos: Procedimento[]
  erro: string
}

export function ProcedimentosList({
  usuario,
  onSessaoExpirada,
}: ProcedimentosListProps) {
  const gestao = usuario.perfil !== 'SECRETARIA'

  const [filtro, setFiltro] = useState('')
  const [situacao, setSituacao] = useState('todos')
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [aviso, setAviso] = useState('')
  const [acao, setAcao] = useState<number | null>(null)

  const carregando = resposta === null || resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    chamarApi<Procedimento[]>('/procedimentos')
      .then((lista) => {
        if (ativo) {
          setResposta({ tentativa, procedimentos: lista, erro: '' })
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
          tentativa,
          procedimentos: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar o catálogo. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [tentativa, onSessaoExpirada])

  async function alterarSituacao(procedimento: Procedimento) {
    setAcao(procedimento.id)
    setAviso('')

    try {
      await chamarApi<Procedimento>(`/procedimentos/${procedimento.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !procedimento.ativo }),
      })

      setTentativa(tentativa + 1)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setAviso(mensagemDoErro(e, 'Não foi possível alterar o procedimento.'))
    }
    finally {
      setAcao(null)
    }
  }

  const todos = carregando ? [] : resposta.procedimentos
  const erro = carregando ? '' : resposta.erro

  const termo = filtro.trim().toLowerCase()
  const procedimentos = todos.filter(
    (item) =>
      item.nome.toLowerCase().includes(termo) &&
      (situacao === 'todos' ||
        (situacao === 'ativos' ? item.ativo : !item.ativo)),
  )

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Catálogo de procedimentos</h2>

        {gestao && (
          <Link to="/procedimentos/novo" className="btn btn-primary btn-sm">
            Novo procedimento
          </Link>
        )}
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-5">
          <label htmlFor="filtro" className="form-label">
            Filtrar por nome
          </label>
          <input
            id="filtro"
            className="form-control"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>

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
            <option value="todos">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="desativados">Desativados</option>
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

      {carregando && <p className="text-secondary">Carregando...</p>}

      {!carregando && !erro && procedimentos.length === 0 && (
        <p className="text-secondary">Nenhum procedimento encontrado.</p>
      )}

      {!carregando && !erro && procedimentos.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Valor</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {procedimentos.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{formatarReais(item.valor_centavos)}</td>
                <td>{item.ativo ? 'Ativo' : 'Desativado'}</td>
                <td>
                  {gestao && (
                    <div className="d-flex gap-1 justify-content-end">
                      <Link
                        to={`/procedimentos/${item.id}/editar`}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className={
                          item.ativo
                            ? 'btn btn-outline-danger btn-sm'
                            : 'btn btn-outline-success btn-sm'
                        }
                        disabled={acao !== null}
                        onClick={() => alterarSituacao(item)}
                      >
                        {acao === item.id
                          ? 'Aguarde...'
                          : item.ativo
                            ? 'Desativar'
                            : 'Reativar'}
                      </button>
                    </div>
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
