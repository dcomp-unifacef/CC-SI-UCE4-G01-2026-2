import { useEffect, useState } from 'react'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { formatarDataHora } from '../utils/datas'
import { PacienteBusca } from './PacienteBusca'
import type { ListaLogAcesso, LogAcesso } from '../types/LogAcesso'
import type { Paciente } from '../types/Paciente'
import type { UsuarioAdmin } from '../types/UsuarioAdmin'

type LogAcessoPainelProps = {
  onSessaoExpirada: () => void
}

type Resposta = {
  consulta: string
  tentativa: number
  itens: LogAcesso[]
  proximo: number | null
  erro: string
}

const TIPOS = [
  { valor: 'FICHA', rotulo: 'Ficha do paciente' },
  { valor: 'LISTA_PACIENTES', rotulo: 'Lista de pacientes' },
  { valor: 'CONSULTA', rotulo: 'Consulta' },
  { valor: 'LISTA_CONSULTAS', rotulo: 'Lista de consultas' },
  { valor: 'HISTORICO_CONSULTA', rotulo: 'Histórico da consulta' },
  { valor: 'VISITA', rotulo: 'Visita' },
  { valor: 'LISTA_VISITAS', rotulo: 'Lista de visitas' },
  { valor: 'RETORNO', rotulo: 'Retorno' },
  { valor: 'LISTA_RETORNOS', rotulo: 'Lista de retornos' },
  { valor: 'HISTORICO_RETORNO', rotulo: 'Histórico do retorno' },
  { valor: 'LISTA_ATRASOS', rotulo: 'Lista de atrasos' },
  { valor: 'LISTA_CONTATOS', rotulo: 'Lista de contatos' },
  { valor: 'ORCAMENTO', rotulo: 'Orçamento' },
  { valor: 'ORCAMENTO_PDF', rotulo: 'PDF do orçamento' },
]

function rotuloTipo(tipo: string): string {
  return TIPOS.find((item) => item.valor === tipo)?.rotulo ?? tipo
}

export function LogAcessoPainel({ onSessaoExpirada }: LogAcessoPainelProps) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [erroUsuarios, setErroUsuarios] = useState('')

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [usuarioId, setUsuarioId] = useState('')
  const [tipo, setTipo] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  const [consulta, setConsulta] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroMais, setErroMais] = useState('')

  const carregando =
    resposta === null ||
    resposta.consulta !== consulta ||
    resposta.tentativa !== tentativa

  useEffect(() => {
    let ativo = true

    chamarApi<UsuarioAdmin[]>('/usuarios')
      .then((lista) => {
        if (ativo) {
          setUsuarios(lista)
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

        setErroUsuarios(
          mensagemDoErro(e, 'Não foi possível carregar a lista de usuários.'),
        )
      })

    return () => {
      ativo = false
    }
  }, [onSessaoExpirada])

  useEffect(() => {
    let ativo = true

    chamarApi<ListaLogAcesso>(`/logs-acesso?${consulta}`)
      .then((lista) => {
        if (ativo) {
          setResposta({
            consulta,
            tentativa,
            itens: lista.itens,
            proximo: lista.proximo_cursor,
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
          consulta,
          tentativa,
          itens: [],
          proximo: null,
          erro: mensagemDoErro(
            e,
            'Não foi possível consultar o log de acesso. Tente novamente.',
          ),
        })
      })

    return () => {
      ativo = false
    }
  }, [consulta, tentativa, onSessaoExpirada])

  const itens = carregando ? [] : resposta.itens
  const proximo = carregando ? null : resposta.proximo
  const erro = carregando ? '' : resposta.erro

  function consultar() {
    const parametros = new URLSearchParams()

    if (paciente !== null) {
      parametros.set('paciente_id', String(paciente.id))
    }

    if (usuarioId !== '') {
      parametros.set('usuario_id', usuarioId)
    }

    if (tipo !== '') {
      parametros.set('tipo', tipo)
    }

    if (de !== '') {
      parametros.set('de', de)
    }

    if (ate !== '') {
      parametros.set('ate', ate)
    }

    setErroMais('')
    setConsulta(parametros.toString())
    setTentativa(tentativa + 1)
  }

  async function carregarMais() {
    if (carregando || proximo === null) {
      return
    }

    setErroMais('')
    setCarregandoMais(true)

    try {
      const separador = consulta === '' ? '' : '&'
      const lista = await chamarApi<ListaLogAcesso>(
        `/logs-acesso?${consulta}${separador}antes_do_id=${proximo}`,
      )

      setResposta({
        consulta,
        tentativa,
        itens: [...itens, ...lista.itens],
        proximo: lista.proximo_cursor,
        erro: '',
      })
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErroMais(
        mensagemDoErro(e, 'Não foi possível carregar mais registros.'),
      )
    }
    finally {
      setCarregandoMais(false)
    }
  }

  return (
    <>
      <h2 className="h5 mb-3">Log de acesso aos dados de pacientes</h2>

      <div className="mb-3">
        <PacienteBusca
          incluirDesativados
          onSelecionar={setPaciente}
          onSessaoExpirada={onSessaoExpirada}
        />
      </div>

      <div className="row g-3 align-items-end mb-3">
        <div className="col-12 col-md-3">
          <label htmlFor="log-usuario" className="form-label">
            Usuário
          </label>
          <select
            id="log-usuario"
            className="form-select"
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
          >
            <option value="">Todos</option>
            {usuarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-3">
          <label htmlFor="log-tipo" className="form-label">
            Tipo de acesso
          </label>
          <select
            id="log-tipo"
            className="form-select"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="">Todos</option>
            {TIPOS.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="col-6 col-md-2">
          <label htmlFor="log-de" className="form-label">
            De
          </label>
          <input
            id="log-de"
            type="date"
            className="form-control"
            value={de}
            onChange={(e) => setDe(e.target.value)}
          />
        </div>

        <div className="col-6 col-md-2">
          <label htmlFor="log-ate" className="form-label">
            Até
          </label>
          <input
            id="log-ate"
            type="date"
            className="form-control"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />
        </div>

        <div className="col-12 col-md-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={carregando}
            onClick={consultar}
          >
            Consultar
          </button>
        </div>
      </div>

      {erroUsuarios && (
        <div className="alert alert-warning" role="alert">
          {erroUsuarios}
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

      {!carregando && !erro && itens.length === 0 && (
        <p className="text-secondary">Nenhum acesso encontrado.</p>
      )}

      {!carregando && !erro && itens.length > 0 && (
        <table className="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Usuário</th>
              <th>Paciente</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td>{formatarDataHora(item.acessado_em)}</td>
                <td>{item.usuario.nome}</td>
                <td>{item.paciente.nome}</td>
                <td>{rotuloTipo(item.tipo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {erroMais && (
        <div className="alert alert-danger" role="alert">
          {erroMais}
        </div>
      )}

      {!carregando && !erro && proximo !== null && (
        <button
          type="button"
          className="btn btn-outline-primary"
          disabled={carregandoMais}
          onClick={carregarMais}
        >
          {carregandoMais ? 'Carregando...' : 'Carregar mais'}
        </button>
      )}
    </>
  )
}
