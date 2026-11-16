import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'

import indexRouter from './routes/index.ts'
import pacientesRouter from './routes/pacientes.ts'
import dentistasRouter from './routes/dentistas.ts'
import historicoVisitasRouter from './routes/historicoVisitas.ts'
import sessoesRouter from './routes/sessoes.ts'
import usuariosRouter from './routes/usuarios.ts'
import configuracoesRouter from './routes/configuracoes.ts'
import consultasRouter from './routes/consultas.ts'
import retornosRouter from './routes/retornos.ts'
import contatosRetornoRouter from './routes/contatosRetorno.ts'
import backupsRouter from './routes/backups.ts'
import procedimentosRouter from './routes/procedimentos.ts'
import orcamentosRouter from './routes/orcamentos.ts'
import consentimentosRouter from './routes/consentimentos.ts'
import logsAcessoRouter from './routes/logsAcesso.ts'

import { Perfil } from '../generated/prisma/client.ts'

import { autenticar } from './middlewares/autenticar.ts'
import { errorHandler } from './middlewares/errorHandler.ts'
import { exigirPerfil } from './middlewares/exigirPerfil.ts'
import { exigirPerfilPorMetodo } from './middlewares/exigirPerfilPorMetodo.ts'
import { verificarOrigem } from './middlewares/verificarOrigem.ts'

const app = express()

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

logger.token('caminho', (req) => (req as express.Request).originalUrl.split('?')[0])
app.use(logger(':method :caminho :status :response-time ms - :res[content-length]'))
app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())

/***************** ROTAS *************************/

app.use('/', indexRouter)

app.use('/sessoes', verificarOrigem(allowedOrigins), sessoesRouter)
app.use('/usuarios', verificarOrigem(allowedOrigins), usuariosRouter)

const protegidoSomenteDono = [
  verificarOrigem(allowedOrigins),
  autenticar,
  exigirPerfil(Perfil.DONO),
]

const autenticado = [
  verificarOrigem(allowedOrigins),
  autenticar,
]

app.use('/pacientes', autenticado, exigirPerfilPorMetodo({
  GET: [Perfil.DONO, Perfil.SECRETARIA, Perfil.DENTISTA],
  POST: [Perfil.DONO, Perfil.SECRETARIA],
  PATCH: [Perfil.DONO, Perfil.SECRETARIA],
  DELETE: [Perfil.DONO],
}), pacientesRouter)

app.use('/dentistas', autenticado, exigirPerfilPorMetodo({
  GET: [Perfil.DONO, Perfil.SECRETARIA, Perfil.DENTISTA],
  POST: [Perfil.DONO],
  PATCH: [Perfil.DONO],
  DELETE: [Perfil.DONO],
}), dentistasRouter)

app.use('/consultas', autenticado, consultasRouter)
app.use('/retornos', autenticado, retornosRouter)
app.use('/contatos-retorno', autenticado, contatosRetornoRouter)
app.use('/procedimentos', autenticado, procedimentosRouter)
app.use('/orcamentos', autenticado, orcamentosRouter)
app.use('/consentimentos', autenticado, consentimentosRouter)
app.use('/logs-acesso', protegidoSomenteDono, logsAcessoRouter)
app.use('/historico-visitas', autenticado, exigirPerfilPorMetodo({
  GET: [Perfil.DONO, Perfil.DENTISTA, Perfil.SECRETARIA],
  POST: [Perfil.DONO, Perfil.DENTISTA],
  PATCH: [Perfil.DONO, Perfil.DENTISTA],
  DELETE: [Perfil.DONO],
}), historicoVisitasRouter)
app.use('/configuracoes', protegidoSomenteDono, configuracoesRouter)
app.use('/backups', protegidoSomenteDono, backupsRouter)

/*********** TRATAMENTO DE ERROS (sempre por último) ***********/

app.use(errorHandler)

export default app
