import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'

type ExcluirRegistroProps = {
  rotulo: string
  aviso: string
  caminho: string
  destino: string
  onSessaoExpirada: () => void
}

export function ExcluirRegistro({
  rotulo,
  aviso,
  caminho,
  destino,
  onSessaoExpirada,
}: ExcluirRegistroProps) {
  const navigate = useNavigate()

  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function excluir() {
    setErro('')
    setEnviando(true)

    try {
      await chamarApi<void>(caminho, { method: 'DELETE' })

      navigate(destino)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setConfirmando(false)
      setErro(mensagemDoErro(e, 'Não foi possível excluir o registro.'))
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-3">
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      {confirmando ? (
        <div className="alert alert-warning" role="alert">
          <p className="mb-2">{aviso}</p>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={enviando}
              onClick={excluir}
            >
              {enviando ? 'Excluindo...' : 'Confirmar exclusão'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={enviando}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => {
            setErro('')
            setConfirmando(true)
          }}
        >
          {rotulo}
        </button>
      )}
    </div>
  )
}
