import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'

type CarregadoProps<T> = {
  titulo: string
  base: string
  voltarPara: string
  voltarRotulo: string
  mensagemPadrao: string
  onSessaoExpirada: () => void
  children: (dado: T, recarregar: () => void) => ReactNode
}

type Estado<T> = {
  id: string
  tentativa: number
  dado: T | null
  erro: string
}

export function Carregado<T>({
  titulo,
  base,
  voltarPara,
  voltarRotulo,
  mensagemPadrao,
  onSessaoExpirada,
  children,
}: CarregadoProps<T>) {
  const { id = '' } = useParams()
  const [tentativa, setTentativa] = useState(0)
  const [estado, setEstado] = useState<Estado<T> | null>(null)

  useEffect(() => {
    let ativo = true

    chamarApi<T>(`${base}/${id}`)
      .then((dado) => {
        if (ativo) {
          setEstado({ id, tentativa, dado, erro: '' })
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
          dado: null,
          erro: mensagemDoErro(e, mensagemPadrao),
        })
      })

    return () => {
      ativo = false
    }
  }, [id, tentativa, base, mensagemPadrao, onSessaoExpirada])

  const carregando =
    estado === null || estado.id !== id || estado.tentativa !== tentativa
  const dado = carregando ? null : estado.dado
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
          <Link to={voltarPara} className="btn btn-outline-secondary">
            {voltarRotulo}
          </Link>
        </>
      )}

      {dado !== null && children(dado, () => setTentativa(tentativa + 1))}
    </>
  )
}
