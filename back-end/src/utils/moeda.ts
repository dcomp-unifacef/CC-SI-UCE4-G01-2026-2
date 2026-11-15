export function formatarReais(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const resto = centavos % 100;

  const inteiro = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `R$ ${inteiro},${String(resto).padStart(2, "0")}`;
}
