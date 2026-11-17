import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ErroApi, chamarApi, mensagemDoErro } from '../services/api'
import { diaDoInstante } from '../utils/datas'
import { CampoMotivo } from './CampoMotivo'
import type { Consulta } from '../types/Consulta'
import type { Usuario } from '../types/Usuario'

type CancelarConsultaProps = {
  usuario: Usuario
  consulta: Consulta
  onSessaoExpirada: () => void
}

export function CancelarConsulta({
  usuario,
  consulta,
  onSessaoExpirada,
}: CancelarConsultaProps) {
  const navigate = useNavigate()
  const dia = diaDoInstante(consulta.inicio_em)

  const [codigo, setCodigo] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    if (codigo === '') {
      setErro('Selecione o motivo do cancelamento.')
      return
    }

    const corpo: Record<string, string> = {
      status: 'CANCELADA',
      motivo_codigo: codigo,
    }

    if (usuario.perfil === 'DONO' && texto.trim() !== '') {
      corpo.motivo = texto.trim()
    }

    setEnviando(true)

    try {
      await chamarApi<Consulta>(`/consultas/${consulta.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(corpo),
      })

      navigate(`/agenda?dia=${dia}`)
    }
    catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        onSessaoExpirada()
        return
      }

      setErro(mensagemDoErro(e, 'Não foi possível cancelar a consulta.'))
    }
    finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar}>
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <div className="row g-3">
        <CampoMotivo
          codigo={codigo}
          texto={texto}
          mostrarTexto={usuario.perfil === 'DONO'}
          onCodigo={setCodigo}
          onTexto={setTexto}
        />
      </div>

      <div className="mt-3 d-flex gap-2">
        <button type="submit" className="btn btn-danger" disabled={enviando}>
          {enviando ? 'Cancelando...' : 'Cancelar consulta'}
        </button>
        <Link to={`/agenda?dia=${dia}`} className="btn btn-outline-secondary">
          Voltar
        </Link>
      </div>
    </form>
  )
}
