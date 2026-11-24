// Firma para identificar los mensajes de WhatsApp como de MassivaMovil.
// Módulo puro (sin axios ni variables de entorno): seguro para client y server.

export const LIMITE_WHATSAPP = 1000;

export const FIRMA_MASSIVA = '\n\n— MassivaMovil';

// Espacio máximo disponible para el texto del usuario (deja caber la firma)
export const LIMITE_TEXTO_WHATSAPP = LIMITE_WHATSAPP - FIRMA_MASSIVA.length;

// Agrega la firma solo si el mensaje aún no identifica a MassivaMovil
export const aplicarFirmaWhatsApp = (message: string): string =>
  /massivamovil/i.test(message) ? message : `${message}${FIRMA_MASSIVA}`;
