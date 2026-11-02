/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Kairós PDV - Formatadores e Utilitários de Cálculo Exato em Centavos
 */

/**
 * Formata um valor em centavos inteiros para o formato monetário brasileiro
 * Exemplo: 1250 -> "R$ 12,50"
 */
export function formatMoney(cents: number): string {
  const safeCents = Math.round(cents || 0);
  const reais = safeCents / 100;
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata um valor em centavos sem o prefixo R$
 * Exemplo: 1250 -> "12,50"
 */
export function formatMoneyRaw(cents: number): string {
  const safeCents = Math.round(cents || 0);
  const reais = safeCents / 100;
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte uma string ou número digitado pelo usuário em centavos inteiros
 * Exemplos:
 * "19,90" -> 1990
 * "19.90" -> 1990
 * "1500" -> 150000 (se interpretar como reais) ou se já for número
 */
export function parseMoneyToCents(value: string | number): number {
  if (typeof value === 'number') {
    return Math.round(value);
  }
  if (!value || typeof value !== 'string') {
    return 0;
  }
  
  // Limpa espaços
  let clean = value.trim();
  
  // Remove prefixos como R$
  clean = clean.replace(/^R\$\s*/i, '');
  
  // Se tiver pontos como separador de milhar e vírgula como decimal (ex: 1.250,50)
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // Apenas vírgula decimal (ex: 19,90)
    clean = clean.replace(',', '.');
  }
  
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Formata data e hora no padrão brasileiro (DD/MM/AAAA HH:mm:ss)
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formata data no padrão brasileiro (DD/MM/AAAA)
 */
export function formatDateOnly(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata hora (HH:mm)
 */
export function formatTimeOnly(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formata CNPJ: XX.XXX.XXX/XXXX-XX
 */
export function formatCNPJ(value: string): string {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 14) return value;
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Formata Telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhone(value: string): string {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  return value;
}

/**
 * Rótulo legível para formas de pagamento
 */
export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'pix':
      return 'Pix';
    case 'debito':
      return 'Cartão de Débito';
    case 'credito':
      return 'Cartão de Crédito';
    case 'outro':
      return 'Outro / Misto';
    default:
      return method;
  }
}
