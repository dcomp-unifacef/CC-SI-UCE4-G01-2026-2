import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDiaCivil } from '../utils/datas'
import type { Paciente } from '../types/Paciente'
import type { Usuario } from '../types/Usuario'

type PacientesListProps = {
  usuario: Usuario
  onSessaoExpirada: () => void
}

type Resposta = {
  chave: string
  pacientes: Paciente[]
  erro: string
}

export function PacientesList({ usuario, onSessaoExpirada }: PacientesListProps) {
  const gestao = usuario.perfil !== 'DENTISTA'

  const [termo, setTermo] = useState('')
  const [incluir, setIncluir] = useState(false)
  const [filtro, setFiltro] = useState({ busca: '', incluir: false })
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)

  const chave = `${filtro.busca}|${filtro.incluir}|${tentativa}`
  const carregando = resposta === null || resposta.chave !== chave

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setFiltro({ busca: termo.trim(), incluir })
  }

  function limpar() {
    setTermo('')
    setIncluir(false)
    setFiltro({ busca: '', incluir: false })
  }

  useEffect(() => {
    let ativo = true

    const caminho =
      filtro.busca === ''
        ? '/pacientes'
        : `/pacientes?busca=${encodeURIComponent(filtro.busca)}&incluir_desativados=${filtro.incluir}`

    chamarApi<Paciente[]>(caminho)
      .then((lista) => {
        if (ativo) {
          setResposta({ chave, pacientes: lista, erro: '' })
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
          pacientes: [],
          erro: mensagemDoErro(
            e,
            'Não foi possível carregar os pacientes. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [chave, filtro, onSessaoExpirada])

  const pacientes = carregando ? [] : resposta.pacientes
  const erro = carregando ? '' : resposta.erro

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Pacientes</h2>

        {gestao && (
          <Link to="/pacientes/novo" className="btn btn-primary btn-sm">
            Novo paciente
          </Link>
        )}
      </div>

      <form className="row g-2 align-items-end mb-3" onSubmit={buscar}>
        <div className="col-12 col-md-5">
          <label htmlFor="busca" className="form-label">
            Buscar por nome ou CPF
          </label>
          <input
            id="busca"
            className="form-control"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-3">
          <div className="form-check">
            <input
              id="incluir"
              className="form-check-input"
              type="checkbox"
              checked={incluir}
              onChange={(e) => setIncluir(e.target.checked)}
            />
            <label htmlFor="incluir" className="form-check-label">
              Incluir desativados
            </label>
          </div>
        </div>

        <div className="col-12 col-md-4 d-flex gap-2">
          <button type="submit" className="btn btn-outline-primary">
            Buscar
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={limpar}
          >
            Limpar
          </button>
        </div>
      </form>

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

      {!carregando && !erro && pacientes.length === 0 && (
        <p className="text-secondary">
          {filtro.busca === ''
            ? 'Nenhum paciente cadastrado.'
            : 'Nenhum paciente encontrado.'}
        </p>
      )}

      {!carregando && !erro && pacientes.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Nascimento</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((paciente) => (
              <tr key={paciente.id}>
                <td>{paciente.nome}</td>
                <td>{paciente.telefone}</td>
                <td>{formatarDiaCivil(paciente.data_nascimento)}</td>
                <td>{paciente.ativo ? 'Ativo' : 'Desativado'}</td>
                <td>
                  <div className="d-flex gap-1 justify-content-end">
                    <Link
                      to={`/pacientes/${paciente.id}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Ver
                    </Link>

                    {gestao && (
                      <Link
                        to={`/pacientes/${paciente.id}/editar`}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Editar
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
