import { useEffect, useState } from 'react'
import { ErroApi, chamarApi } from '../services/api'
import type { Paciente } from '../types/Paciente'

type PacientesListProps = {
  onSessaoExpirada: () => void
}

function formatarData(valor: string): string {
  const [ano, mes, dia] = valor.slice(0, 10).split('-')

  return `${dia}/${mes}/${ano}`
}

export function PacientesList({ onSessaoExpirada }: PacientesListProps) {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)

  function tentarNovamente() {
    setCarregando(true)
    setErro('')
    setTentativa(tentativa + 1)
  }

  useEffect(() => {
    let ativo = true

    chamarApi<Paciente[]>('/pacientes')
      .then((lista) => {
        if (ativo) {
          setPacientes(lista)
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

        setPacientes([])
        setErro(
          e instanceof ErroApi
            ? e.message
            : 'Não foi possível carregar os pacientes. Tente novamente.',
        )
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false)
        }
      })

    return () => {
      ativo = false
    }
  }, [tentativa, onSessaoExpirada])

  return (
    <>
      <h2 className="h5 mb-3">Pacientes</h2>

      {erro && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{erro}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={tentarNovamente}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {carregando && <p className="text-secondary">Carregando...</p>}

      {!carregando && !erro && pacientes.length === 0 && (
        <p className="text-secondary">Nenhum paciente cadastrado.</p>
      )}

      {!carregando && !erro && pacientes.length > 0 && (
        <table className="table table-striped table-sm">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Nascimento</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((paciente) => (
              <tr key={paciente.id}>
                <td>{paciente.nome}</td>
                <td>{paciente.telefone}</td>
                <td>{formatarData(paciente.data_nascimento)}</td>
                <td>{paciente.ativo ? 'Ativo' : 'Desativado'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
