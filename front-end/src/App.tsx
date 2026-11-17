import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
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
import { Carregado } from './components/Carregado'
import { DentistaFicha } from './components/DentistaFicha'
import { DentistaForm } from './components/DentistaForm'
import { DentistasList } from './components/DentistasList'
import { OrcamentoFicha } from './components/OrcamentoFicha'
import { OrcamentoNovo } from './components/OrcamentoNovo'
import { OrcamentosList } from './components/OrcamentosList'
import { ProcedimentoForm } from './components/ProcedimentoForm'
import { ProcedimentosList } from './components/ProcedimentosList'
import { RetornoAcao } from './components/RetornoAcao'
import { RetornosPaciente } from './components/RetornosPaciente'
import { RetornosPainel } from './components/RetornosPainel'
import { VisitaFicha } from './components/VisitaFicha'
import { VisitaForm } from './components/VisitaForm'
import { VisitasList } from './components/VisitasList'
import { BackupsPainel } from './components/BackupsPainel'
import { ConfiguracoesForm } from './components/ConfiguracoesForm'
import { LogAcessoPainel } from './components/LogAcessoPainel'
import { UsuarioFicha } from './components/UsuarioFicha'
import { UsuarioForm } from './components/UsuarioForm'
import { UsuariosList } from './components/UsuariosList'
import { ErroApi, chamarApi } from './services/api'
import type { Dentista } from './types/Dentista'
import type { Orcamento } from './types/Orcamento'
import type { Procedimento } from './types/Procedimento'
import type { Retorno } from './types/Retorno'
import type { Usuario } from './types/Usuario'
import type { UsuarioAdmin } from './types/UsuarioAdmin'
import type { Visita } from './types/Visita'

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

  function pagina(
    elemento: (autenticado: Usuario) => ReactNode,
    proibidos: Usuario['perfil'][] = [],
    destino = '/agenda',
  ) {
    if (!usuario) {
      return <Navigate to="/login" replace />
    }

    if (proibidos.includes(usuario.perfil)) {
      return <Navigate to={destino} replace />
    }

    return elemento(usuario)
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

              <li className="nav-item">
                <NavLink to="/dentistas" className="nav-link">
                  Dentistas
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink to="/visitas" className="nav-link">
                  Visitas
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink to="/retornos" className="nav-link">
                  Retornos
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink to="/procedimentos" className="nav-link">
                  Catálogo
                </NavLink>
              </li>

              <li className="nav-item">
                <NavLink to="/orcamentos" className="nav-link">
                  Orçamentos
                </NavLink>
              </li>

              {usuario.perfil === 'DONO' && (
                <>
                  <li className="nav-item">
                    <NavLink to="/usuarios" className="nav-link">
                      Usuários
                    </NavLink>
                  </li>

                  <li className="nav-item">
                    <NavLink to="/configuracoes" className="nav-link">
                      Configurações
                    </NavLink>
                  </li>

                  <li className="nav-item">
                    <NavLink to="/backups" className="nav-link">
                      Backup
                    </NavLink>
                  </li>

                  <li className="nav-item">
                    <NavLink to="/log-acesso" className="nav-link">
                      Log de acesso
                    </NavLink>
                  </li>
                </>
              )}
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
                    <PacienteFicha
                      usuario={usuario}
                      paciente={paciente}
                      onSessaoExpirada={sessaoExpirada}
                    />
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

          <Route
            path="/dentistas"
            element={pagina((u) => (
              <DentistasList usuario={u} onSessaoExpirada={sessaoExpirada} />
            ))}
          />

          <Route
            path="/dentistas/novo"
            element={pagina(
              () => (
                <>
                  <h2 className="h5 mb-3">Novo dentista</h2>
                  <DentistaForm onSessaoExpirada={sessaoExpirada} />
                </>
              ),
              ['SECRETARIA', 'DENTISTA'],
              '/dentistas',
            )}
          />

          <Route
            path="/dentistas/:id"
            element={pagina((u) => (
              <Carregado<Dentista>
                key="dentista-ficha"
                titulo="Dentista"
                base="/dentistas"
                voltarPara="/dentistas"
                voltarRotulo="Voltar aos dentistas"
                mensagemPadrao="Não foi possível carregar o dentista."
                onSessaoExpirada={sessaoExpirada}
              >
                {(dentista, recarregar) => (
                  <DentistaFicha
                    usuario={u}
                    dentista={dentista}
                    onRecarregar={recarregar}
                    onSessaoExpirada={sessaoExpirada}
                  />
                )}
              </Carregado>
            ))}
          />

          <Route
            path="/dentistas/:id/editar"
            element={pagina(
              () => (
                <Carregado<Dentista>
                  key="dentista-editar"
                  titulo="Editar dentista"
                  base="/dentistas"
                  voltarPara="/dentistas"
                  voltarRotulo="Voltar aos dentistas"
                  mensagemPadrao="Não foi possível carregar o dentista."
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(dentista) => (
                    <DentistaForm
                      dentista={dentista}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </Carregado>
              ),
              ['SECRETARIA', 'DENTISTA'],
              '/dentistas',
            )}
          />

          <Route
            path="/visitas"
            element={pagina((u) => (
              <VisitasList usuario={u} onSessaoExpirada={sessaoExpirada} />
            ))}
          />

          <Route
            path="/visitas/nova"
            element={pagina(
              () => (
                <>
                  <h2 className="h5 mb-3">Nova visita</h2>
                  <VisitaForm onSessaoExpirada={sessaoExpirada} />
                </>
              ),
              ['SECRETARIA'],
              '/visitas',
            )}
          />

          <Route
            path="/visitas/:id"
            element={pagina((u) => (
              <Carregado<Visita>
                key="visita-ficha"
                titulo="Visita"
                base="/historico-visitas"
                voltarPara="/visitas"
                voltarRotulo="Voltar às visitas"
                mensagemPadrao="Não foi possível carregar a visita."
                onSessaoExpirada={sessaoExpirada}
              >
                {(visita) => <VisitaFicha usuario={u} visita={visita} />}
              </Carregado>
            ))}
          />

          <Route
            path="/visitas/:id/editar"
            element={pagina(
              () => (
                <Carregado<Visita>
                  key="visita-editar"
                  titulo="Editar visita"
                  base="/historico-visitas"
                  voltarPara="/visitas"
                  voltarRotulo="Voltar às visitas"
                  mensagemPadrao="Não foi possível carregar a visita."
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(visita) => (
                    <VisitaForm
                      visita={visita}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </Carregado>
              ),
              ['SECRETARIA'],
              '/visitas',
            )}
          />

          <Route
            path="/visitas/:id/retorno"
            element={pagina(
              () => (
                <Carregado<Visita>
                  key="visita-retorno"
                  titulo="Criar retorno"
                  base="/historico-visitas"
                  voltarPara="/retornos"
                  voltarRotulo="Voltar aos retornos"
                  mensagemPadrao="Não foi possível carregar a visita."
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(visita) => (
                    <RetornoAcao
                      modo="criar"
                      visita={visita}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </Carregado>
              ),
              ['SECRETARIA'],
              '/retornos',
            )}
          />

          <Route
            path="/retornos"
            element={pagina((u) => (
              <RetornosPainel usuario={u} onSessaoExpirada={sessaoExpirada} />
            ))}
          />

          <Route
            path="/retornos/paciente/:id"
            element={pagina((u) => (
              <RetornosPaciente usuario={u} onSessaoExpirada={sessaoExpirada} />
            ))}
          />

          <Route
            path="/retornos/:id/corrigir"
            element={pagina(
              () => (
                <Carregado<Retorno>
                  key="retorno-corrigir"
                  titulo="Corrigir data do retorno"
                  base="/retornos"
                  voltarPara="/retornos"
                  voltarRotulo="Voltar aos retornos"
                  mensagemPadrao="Não foi possível carregar o retorno."
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(retorno) => (
                    <RetornoAcao
                      modo="corrigir"
                      retorno={retorno}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </Carregado>
              ),
              ['SECRETARIA'],
              '/retornos',
            )}
          />

          <Route
            path="/retornos/:id/descartar"
            element={pagina(
              () => (
                <Carregado<Retorno>
                  key="retorno-descartar"
                  titulo="Descartar retorno"
                  base="/retornos"
                  voltarPara="/retornos"
                  voltarRotulo="Voltar aos retornos"
                  mensagemPadrao="Não foi possível carregar o retorno."
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(retorno) => (
                    <RetornoAcao
                      modo="descartar"
                      retorno={retorno}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </Carregado>
              ),
              ['SECRETARIA', 'DENTISTA'],
              '/retornos',
            )}
          />

          <Route
            path="/procedimentos"
            element={pagina((u) => (
              <ProcedimentosList usuario={u} onSessaoExpirada={sessaoExpirada} />
            ))}
          />

          <Route
            path="/procedimentos/novo"
            element={pagina(
              () => (
                <>
                  <h2 className="h5 mb-3">Novo procedimento</h2>
                  <ProcedimentoForm onSessaoExpirada={sessaoExpirada} />
                </>
              ),
              ['SECRETARIA'],
              '/procedimentos',
            )}
          />

          <Route
            path="/procedimentos/:id/editar"
            element={pagina(
              () => (
                <Carregado<Procedimento>
                  key="procedimento-editar"
                  titulo="Editar procedimento"
                  base="/procedimentos"
                  voltarPara="/procedimentos"
                  voltarRotulo="Voltar ao catálogo"
                  mensagemPadrao="Não foi possível carregar o procedimento."
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(procedimento) => (
                    <ProcedimentoForm
                      procedimento={procedimento}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </Carregado>
              ),
              ['SECRETARIA'],
              '/procedimentos',
            )}
          />

          <Route
            path="/orcamentos"
            element={pagina((u) => (
              <OrcamentosList usuario={u} onSessaoExpirada={sessaoExpirada} />
            ))}
          />

          <Route
            path="/orcamentos/novo"
            element={pagina(
              () => (
                <>
                  <h2 className="h5 mb-3">Novo orçamento</h2>
                  <OrcamentoNovo onSessaoExpirada={sessaoExpirada} />
                </>
              ),
              ['SECRETARIA'],
              '/orcamentos',
            )}
          />

          <Route
            path="/orcamentos/:id"
            element={pagina((u) => (
              <Carregado<Orcamento>
                key="orcamento-ficha"
                titulo="Orçamento"
                base="/orcamentos"
                voltarPara="/orcamentos"
                voltarRotulo="Voltar aos orçamentos"
                mensagemPadrao="Não foi possível carregar o orçamento."
                onSessaoExpirada={sessaoExpirada}
              >
                {(orcamento, recarregar) => (
                  <OrcamentoFicha
                    usuario={u}
                    orcamento={orcamento}
                    onRecarregar={recarregar}
                    onSessaoExpirada={sessaoExpirada}
                  />
                )}
              </Carregado>
            ))}
          />

          <Route
            path="/usuarios"
            element={pagina(
              () => <UsuariosList onSessaoExpirada={sessaoExpirada} />,
              ['SECRETARIA', 'DENTISTA'],
            )}
          />

          <Route
            path="/usuarios/novo"
            element={pagina(
              () => (
                <>
                  <h2 className="h5 mb-3">Novo usuário</h2>
                  <UsuarioForm onSessaoExpirada={sessaoExpirada} />
                </>
              ),
              ['SECRETARIA', 'DENTISTA'],
            )}
          />

          <Route
            path="/usuarios/:id"
            element={pagina(
              (u) => (
                <Carregado<UsuarioAdmin>
                  key="usuario-ficha"
                  titulo="Usuário"
                  base="/usuarios"
                  voltarPara="/usuarios"
                  voltarRotulo="Voltar aos usuários"
                  mensagemPadrao="Não foi possível carregar o usuário."
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(alvo, recarregar) => (
                    <UsuarioFicha
                      usuario={u}
                      alvo={alvo}
                      onRecarregar={recarregar}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </Carregado>
              ),
              ['SECRETARIA', 'DENTISTA'],
            )}
          />

          <Route
            path="/usuarios/:id/editar"
            element={pagina(
              () => (
                <Carregado<UsuarioAdmin>
                  key="usuario-editar"
                  titulo="Editar usuário"
                  base="/usuarios"
                  voltarPara="/usuarios"
                  voltarRotulo="Voltar aos usuários"
                  mensagemPadrao="Não foi possível carregar o usuário."
                  onSessaoExpirada={sessaoExpirada}
                >
                  {(alvo) => (
                    <UsuarioForm
                      alvo={alvo}
                      onSessaoExpirada={sessaoExpirada}
                    />
                  )}
                </Carregado>
              ),
              ['SECRETARIA', 'DENTISTA'],
            )}
          />

          <Route
            path="/configuracoes"
            element={pagina(
              () => <ConfiguracoesForm onSessaoExpirada={sessaoExpirada} />,
              ['SECRETARIA', 'DENTISTA'],
            )}
          />

          <Route
            path="/backups"
            element={pagina(
              () => <BackupsPainel onSessaoExpirada={sessaoExpirada} />,
              ['SECRETARIA', 'DENTISTA'],
            )}
          />

          <Route
            path="/log-acesso"
            element={pagina(
              () => <LogAcessoPainel onSessaoExpirada={sessaoExpirada} />,
              ['SECRETARIA', 'DENTISTA'],
            )}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
