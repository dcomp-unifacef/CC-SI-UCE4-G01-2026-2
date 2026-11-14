import type { CookieOptions } from 'express'


export const NOME_DO_COOKIE = 'odonto_sessao'


function opcoesBase(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.COOKIE_SECURE === 'true',
  }
}


export function opcoesDoCookie(duracaoEmMs: number): CookieOptions {
  return { ...opcoesBase(), maxAge: duracaoEmMs }
}


export function opcoesParaLimpar(): CookieOptions {
  return opcoesBase()
}
