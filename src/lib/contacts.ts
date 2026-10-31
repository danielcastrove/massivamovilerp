export type ContactoTipo = "EMAIL" | "PHONE";

export interface ContactoExtra {
  tipo: ContactoTipo;
  valor: string;
}

export type ContactoFuente = "principal" | "contacto" | "cobranza" | "extra";

export interface ContactoOpcion {
  valor: string;
  fuente: ContactoFuente;
}

export function formatPhoneParaEnvio(valor: string): string {
  const digits = valor.replace(/\D/g, "");
  if (!digits) return valor.trim();
  const base = digits.startsWith("0") ? digits.slice(1) : digits;
  return `+${base.startsWith("58") ? base : `58${base}`}`;
}

export function normalizeValor(valor: string, tipo: ContactoTipo): string {
  const trimmed = valor.trim();
  if (tipo === "EMAIL") return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  const base = digits.startsWith("0") ? digits.slice(1) : digits;
  return base.startsWith("58") ? base : `58${base}`;
}

export function parseContactosExtra(raw: unknown): ContactoExtra[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c): c is ContactoExtra =>
        !!c &&
        typeof c === "object" &&
        ((c as { tipo?: unknown }).tipo === "EMAIL" || (c as { tipo?: unknown }).tipo === "PHONE") &&
        typeof (c as { valor?: unknown }).valor === "string" &&
        ((c as { valor: string }).valor.trim().length > 0)
    )
    .map((c) => ({ tipo: c.tipo, valor: c.valor.trim() }));
}

export function buildContactOptions(
  contactos: Array<{ valor: string | null | undefined; fuente: ContactoFuente }>,
  tipo: ContactoTipo,
  extras: ContactoExtra[]
): ContactoOpcion[] {
  const seen = new Set<string>();
  const opciones: ContactoOpcion[] = [];

  const add = (valor: string | null | undefined, fuente: ContactoFuente) => {
    const trimmed = valor?.trim();
    if (!trimmed) return;
    const key = normalizeValor(trimmed, tipo);
    if (!key || seen.has(key)) return;
    seen.add(key);
    opciones.push({ valor: trimmed, fuente });
  };

  for (const c of contactos) add(c.valor, c.fuente);
  for (const e of extras) if (e.tipo === tipo) add(e.valor, "extra");

  return opciones;
}

export function appendContactoExtra(actual: unknown, tipo: ContactoTipo, valor: string): ContactoExtra[] {
  const lista = parseContactosExtra(actual);
  const key = normalizeValor(valor, tipo);
  if (!key) return lista;
  if (lista.some((c) => c.tipo === tipo && normalizeValor(c.valor, tipo) === key)) return lista;
  const guardado = tipo === "PHONE" ? formatPhoneParaEnvio(valor) : valor.trim();
  return [...lista, { tipo, valor: guardado }];
}

export function yaTieneContacto(actual: unknown, tipo: ContactoTipo, valor: string, principales: Array<string | null | undefined> = []): boolean {
  const key = normalizeValor(valor, tipo);
  if (!key) return false;
  if (principales.some((p) => normalizeValor(p || "", tipo) === key)) return true;
  return parseContactosExtra(actual).some((c) => c.tipo === tipo && normalizeValor(c.valor, tipo) === key);
}

export function isValidEmail(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

export function isValidPhone(valor: string): boolean {
  const trimmed = valor.trim();
  if (!/^[\d\s()+\-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
