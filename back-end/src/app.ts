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

import { errorHandler } from './middlewares/errorHandler.ts'

const app = express()

// CORS: somente as origens (URLs de front-end) listadas em ALLOWED_ORIGINS
// são aceitas. Sem a variável, valem as origens padrão de desenvolvimento.
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins,
}))

// O log registra o caminho sem a query string, que poderia conter dados
// pessoais (por exemplo, um CPF em uma busca).
logger.token('caminho', (req) => (req as express.Request).originalUrl.split('?')[0])
app.use(logger(':method :caminho :status :response-time ms - :res[content-length]'))
app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())

/***************** ROTAS *************************/

app.use('/', indexRouter)
app.use('/users', usersRouter)

app.use('/pacientes', pacientesRouter)
app.use('/dentistas', dentistasRouter)
app.use('/historico-visitas', historicoVisitasRouter)

/*********** TRATAMENTO DE ERROS (sempre por último) ***********/

app.use(errorHandler)

export default app
