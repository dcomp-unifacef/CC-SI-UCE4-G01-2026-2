import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import type { Paciente } from '../types/Paciente'

type PacienteBuscaProps = {
  incluirDesativados?: boolean
  onSelecionar: (paciente: Paciente | null) => void
  onSessaoExpirada: () => void
}

export function PacienteBusca({
  incluirDesativados = false,
  onSelecionar,
  onSessaoExpirada,
}: PacienteBuscaProps) {
  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [selecionado, setSelecionado] = useState('')

  async function buscar() {
    const termo = busca.trim()

    if (termo === '') {
      setMensagem('Digite o nome do paciente para buscar.')
      return
    }

    setBuscando(true)
    setMensagem('')

    try {
      const filtro = incluirDesativados ? '&incluir_desativados=true' : ''
      const lista = await chamarApi<Paciente[]>(
        `/pacientes?busca=${encodeURIComponent(termo)}${filtro}`,
      )

      setPacientes(lista)
      setSelecionado(lista.length > 0 ? String(lista[0].id) : '')
      onSelecionar(lista.length > 0 ? lista[0] : null)

      if (lista.length === 0) {
        setMensagem('Nenhum paciente encontrado.')
      }
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setMensagem(
        mensagemDoErro(e, 'Não foi possível buscar os pacientes. Tente novamente.'),
      )
    }
    finally {
      setBuscando(false)
    }
  }

  function aoDigitar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'Enter') {
      evento.preventDefault()
      buscar()
    }
  }

  function aoSelecionar(valor: string) {
    setSelecionado(valor)
    onSelecionar(pacientes.find((p) => String(p.id) === valor) ?? null)
  }

  return (
    <div className="row g-2 align-items-end">
      <div className="col-12 col-md-5">
        <label htmlFor="busca-paciente" className="form-label">
          Buscar paciente por nome
        </label>
        <input
          id="busca-paciente"
          className="form-control"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={aoDigitar}
        />
      </div>

      <div className="col-12 col-md-2">
        <button
          type="button"
          className="btn btn-outline-primary"
          disabled={buscando}
          onClick={buscar}
        >
          {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {pacientes.length > 0 && (
        <div className="col-12 col-md-5">
          <label htmlFor="paciente" className="form-label">
            Paciente
          </label>
          <select
            id="paciente"
            className="form-select"
            value={selecionado}
            onChange={(e) => aoSelecionar(e.target.value)}
          >
            {pacientes.map((paciente) => (
              <option key={paciente.id} value={paciente.id}>
                {paciente.nome}
                {paciente.ativo ? '' : ' (desativado)'}
              </option>
            ))}
          </select>
        </div>
      )}

      {mensagem && (
        <div className="col-12">
          <p className="text-secondary mb-0">{mensagem}</p>
        </div>
      )}
    </div>
  )
}
