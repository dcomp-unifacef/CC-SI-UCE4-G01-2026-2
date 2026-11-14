export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '')
}


export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value)

  if (cpf.length !== 11) return false

  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digito = (base: string, pesoInicial: number): number => {
    let soma = 0
    let peso = pesoInicial

    for (const caractere of base) {
      soma += Number(caractere) * peso
      peso -= 1
    }

    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return (
    digito(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    digito(cpf.slice(0, 10), 11) === Number(cpf[10])
  )
}
