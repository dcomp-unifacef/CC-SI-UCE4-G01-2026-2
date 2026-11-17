import { useState } from 'react'
import { Link } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { ExcluirRegistro } from './ExcluirRegistro'
import type { Dentista } from '../types/Dentista'
import type { Usuario } from '../types/Usuario'

type DentistaFichaProps = {
  usuario: Usuario
  dentista: Dentista
  onRecarregar: () => void
  onSessaoExpirada: () => void
}

export function DentistaFicha({
  usuario,
  dentista,
  onRecarregar,
  onSessaoExpirada,
}: DentistaFichaProps) {
  const dono = usuario.perfil === 'DONO'

  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function alterarSituacao() {
    setErro('')
    setEnviando(true)

    try {
      await chamarApi<Dentista>(`/dentistas/${dentista.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !dentista.ativo }),
      })

      onRecarregar()
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível alterar o dentista.'))
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <dl className="row">
        <dt className="col-sm-3">Nome</dt>
        <dd className="col-sm-9">{dentista.nome}</dd>
        <dt className="col-sm-3">Situação</dt>
        <dd className="col-sm-9">{dentista.ativo ? 'Ativo' : 'Desativado'}</dd>
      </dl>

      <div className="d-flex gap-2">
        {dono && (
          <Link
            to={`/dentistas/${dentista.id}/editar`}
            className="btn btn-primary"
          >
            Editar
          </Link>
        )}

        {dono && (
          <button
            type="button"
            className={
              dentista.ativo ? 'btn btn-outline-danger' : 'btn btn-outline-success'
            }
            disabled={enviando}
            onClick={alterarSituacao}
          >
            {enviando ? 'Aguarde...' : dentista.ativo ? 'Desativar' : 'Reativar'}
          </button>
        )}

        <Link to="/dentistas" className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>

      {dono && (
        <ExcluirRegistro
          rotulo="Excluir dentista"
          aviso="A exclusão é definitiva. Dentistas com visitas, consultas ou orçamentos não podem ser excluídos; nesse caso, desative o dentista."
          caminho={`/dentistas/${dentista.id}`}
          destino="/dentistas"
          onSessaoExpirada={onSessaoExpirada}
        />
      )}
    </>
  )
}
