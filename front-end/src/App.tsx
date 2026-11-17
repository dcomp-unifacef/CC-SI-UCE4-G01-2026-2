import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router'
import { Login } from './components/Login'
import { PacientesList } from './components/PacientesList'
import { ErroApi, chamarApi } from './services/api'
import type { Usuario } from './types/Usuario'

function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    chamarApi<{ usuario: Usuario }>('/sessoes/atual')
      .then((resposta) => setUsuario(resposta.usuario))
      .catch((e) => {
        setUsuario(null)

        if (e instanceof ErroApi && e.status !== 401) {
          setAviso(e.message)
        }
      })
      .finally(() => setCarregando(false))
  }, [])

  const sessaoExpirada = useCallback(() => {
    setUsuario(null)
    setAviso('Sua sessão expirou. Entre novamente.')
  }, [])

  function entrar(autenticado: Usuario) {
    setAviso('')
    setUsuario(autenticado)
  }

  async function sair() {
    try {
      await chamarApi<void>('/sessoes/atual', { method: 'DELETE' })
    }
    catch (e) {
      if (e instanceof ErroApi && e.status !== 401) {
        setAviso(e.message)
        return
      }
    }

    setAviso('')
    setUsuario(null)
  }

  if (carregando) {
    return <p className="container py-4 text-secondary">Carregando...</p>
  }

  return (
    <BrowserRouter>
      <header className="bg-dark text-white py-3">
        <div className="container d-flex justify-content-between align-items-center">
          <h1 className="h4 mb-0">OdontoSystem</h1>

          {usuario && (
            <div className="d-flex align-items-center gap-3">
              <span>
                {usuario.nome} ({usuario.perfil})
              </span>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={sair}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </header>

      {usuario && (
        <nav className="bg-light border-bottom py-2">
          <div className="container">
            <ul className="nav nav-pills">
              <li className="nav-item">
                <NavLink to="/pacientes" className="nav-link">
                  Pacientes
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      )}

      <main className="container py-4">
        {aviso && (
          <div className="alert alert-warning" role="alert">
            {aviso}
          </div>
        )}

        <Routes>
          <Route path="/" element={<Navigate to="/pacientes" replace />} />

          <Route
            path="/login"
            element={
              usuario ? (
                <Navigate to="/pacientes" replace />
              ) : (
                <Login onEntrar={entrar} />
              )
            }
          />

          <Route
            path="/pacientes"
            element={
              usuario ? (
                <PacientesList onSessaoExpirada={sessaoExpirada} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
