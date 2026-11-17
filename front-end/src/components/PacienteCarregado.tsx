import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import type { PacienteComConsentimento } from '../types/Paciente'

type PacienteCarregadoProps = {
  titulo: string
  onSessaoExpirada: () => void
  children: (paciente: PacienteComConsentimento) => ReactNode
}

type Estado = {
  id: string
  tentativa: number
  paciente: PacienteComConsentimento | null
  erro: string
}

export function PacienteCarregado({
  titulo,
  onSessaoExpirada,
  children,
}: PacienteCarregadoProps) {
  const { id = '' } = useParams()
  const [tentativa, setTentativa] = useState(0)
  const [estado, setEstado] = useState<Estado | null>(null)

  useEffect(() => {
    let ativo = true

    chamarApi<PacienteComConsentimento>(`/pacientes/${id}`)
      .then((paciente) => {
        if (ativo) {
          setEstado({ id, tentativa, paciente, erro: '' })
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
          tentativa,
          paciente: null,
          erro: mensagemDoErro(e, 'Não foi possível carregar o paciente.'),
        })
      })

    return () => {
      ativo = false
    }
  }, [id, tentativa, onSessaoExpirada])

  const carregando =
    estado === null || estado.id !== id || estado.tentativa !== tentativa
  const paciente = carregando ? null : estado.paciente
  const erro = carregando ? '' : estado.erro

  return (
    <>
      <h2 className="h5 mb-3">{titulo}</h2>

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
          <Link to="/pacientes" className="btn btn-outline-secondary">
            Voltar aos pacientes
          </Link>
        </>
      )}

      {paciente && children(paciente)}
    </>
  )
}
