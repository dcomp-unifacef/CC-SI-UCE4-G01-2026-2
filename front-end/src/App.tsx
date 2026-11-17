import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router'
import { AgendaDia } from './components/AgendaDia'
import { CancelarConsulta } from './components/CancelarConsulta'
import { ConsultaCarregada } from './components/ConsultaCarregada'
import { ConsultaForm } from './components/ConsultaForm'
import { RealizarConsulta } from './components/RealizarConsulta'
import { ReagendarConsulta } from './components/ReagendarConsulta'
import { Login } from './components/Login'
import { PacienteCarregado } from './components/PacienteCarregado'
import { PacienteFicha } from './components/PacienteFicha'
import { PacienteForm } from './components/PacienteForm'
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
                <NavLink to="/agenda" className="nav-link">
                  Agenda
                </NavLink>
              </li>

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
          <Route path="/" element={<Navigate to="/agenda" replace />} />

          <Route
            path="/login"
            element={
              usuario ? (
                <Navigate to="/agenda" replace />
              ) : (
                <Login onEntrar={entrar} />
              )
            }
          />

          <Route
            path="/agenda"
            element={
              usuario ? (
                <AgendaDia usuario={usuario} onSessaoExpirada={sessaoExpirada} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/agenda/nova"
            element={
              !usuario ? (
                <Navigate to="/login" replace />
              ) : usuario.perfil === 'DENTISTA' ? (
                <Navigate to="/agenda" replace />
              ) : (
                <ConsultaForm onSessaoExpirada={sessaoExpirada} />
              )
            }
          />

          <Route
            path="/agenda/:id/cancelar"
            element={
              !usuario ? (
                <Navigate to="/login" replace />
              ) : usuario.perfil === 'DENTISTA' ? (
                <Navigate to="/agenda" replace />
              ) : (
                <ConsultaCarregada
                  titulo="Cancelar consulta"
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(consulta) => (
                    <CancelarConsulta
                      usuario={usuario}
                      consulta={consulta}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </ConsultaCarregada>
              )
            }
          />

          <Route
            path="/agenda/:id/reagendar"
            element={
              !usuario ? (
                <Navigate to="/login" replace />
              ) : usuario.perfil === 'DENTISTA' ? (
                <Navigate to="/agenda" replace />
              ) : (
                <ConsultaCarregada
                  titulo="Reagendar consulta"
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(consulta) => (
                    <ReagendarConsulta
                      usuario={usuario}
                      consulta={consulta}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </ConsultaCarregada>
              )
            }
          />

          <Route
            path="/agenda/:id/realizar"
            element={
              !usuario ? (
                <Navigate to="/login" replace />
              ) : usuario.perfil === 'SECRETARIA' ? (
                <Navigate to="/agenda" replace />
              ) : (
                <ConsultaCarregada
                  titulo="Realizar atendimento"
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(consulta) => (
                    <RealizarConsulta
                      consulta={consulta}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </ConsultaCarregada>
              )
            }
          />

          <Route
            path="/pacientes"
            element={
              usuario ? (
                <PacientesList
                  usuario={usuario}
                  onSessaoExpirada={sessaoExpirada}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/pacientes/novo"
            element={
              !usuario ? (
                <Navigate to="/login" replace />
              ) : usuario.perfil === 'DENTISTA' ? (
                <Navigate to="/pacientes" replace />
              ) : (
                <>
                  <h2 className="h5 mb-3">Novo paciente</h2>
                  <PacienteForm onSessaoExpirada={sessaoExpirada} />
                </>
              )
            }
          />

          <Route
            path="/pacientes/:id"
            element={
              usuario ? (
                <PacienteCarregado
                  key="ficha"
                  titulo="Paciente"
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(paciente) => (
                    <PacienteFicha usuario={usuario} paciente={paciente} />
                  )}
                </PacienteCarregado>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/pacientes/:id/editar"
            element={
              !usuario ? (
                <Navigate to="/login" replace />
              ) : usuario.perfil === 'DENTISTA' ? (
                <Navigate to="/pacientes" replace />
              ) : (
                <PacienteCarregado
                  key="editar"
                  titulo="Editar paciente"
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(paciente) => (
                    <PacienteForm
                      paciente={paciente}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </PacienteCarregado>
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
