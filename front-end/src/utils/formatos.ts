export function formatarCpf(cpf: string): string {
  const digitos = cpf.replace(/\D/g, '')

  if (digitos.length !== 11) {
    return cpf
  }

  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}
