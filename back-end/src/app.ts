import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'

import indexRouter from './routes/index'
import usersRouter from './routes/users'
import pacientesRouter from './routes/pacientes.ts'
import dentistasRouter from './routes/dentistas.ts'
import historicoVisitasRouter from './routes/historicoVisitas.ts'
import sessoesRouter from './routes/sessoes.ts'
import usuariosRouter from './routes/usuarios.ts'

import { errorHandler } from './middlewares/errorHandler.ts'
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
app.use('/users', usersRouter)

app.use('/sessoes', verificarOrigem(allowedOrigins), sessoesRouter)
app.use('/usuarios', verificarOrigem(allowedOrigins), usuariosRouter)

app.use('/pacientes', pacientesRouter)
app.use('/dentistas', dentistasRouter)
app.use('/historico-visitas', historicoVisitasRouter)

/*********** TRATAMENTO DE ERROS (sempre por último) ***********/

app.use(errorHandler)

export default app
