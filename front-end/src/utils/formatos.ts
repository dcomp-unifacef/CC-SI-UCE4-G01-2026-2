const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatarCpf(cpf: string): string {
  const digitos = cpf.replace(/\D/g, '')

  if (digitos.length !== 11) {
    return cpf
  }

  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

export function formatarReais(centavos: number): string {
  return moeda.format(centavos / 100)
}

export function lerReais(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(/^R\$/, '')

  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(limpo)) {
    return null
  }

  const [inteiro, decimal = ''] = limpo.replace(/\./g, '').split(',')

  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'))
}
