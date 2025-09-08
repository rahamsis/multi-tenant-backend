export function nextCode(code: string): string {
  // 1. Extraer las letras iniciales
  const prefix = code.match(/[A-Za-z]+/)?.[0] ?? "";

  // 2. Extraer la parte numérica
  const numberPart = code.match(/\d+/)?.[0] ?? "0";

  // 3. Convertir a número e incrementar
  const nextNumber = (parseInt(numberPart, 10) + 1).toString();

  // 4. Rellenar con ceros a la izquierda según la longitud original
  const paddedNumber = nextNumber.padStart(numberPart.length, "0");

  return prefix + paddedNumber;
}
