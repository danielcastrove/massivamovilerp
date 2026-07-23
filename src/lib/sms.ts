
interface SmsApiResponse {
  mensaje: string;
  status: string;
  telefonos?: Array<{
    sid: string;
    status: string;
    num_celular: string;
    texto: string;
  }>;
  error?: string;
  statusCode?: string;
}

function sanitizeSmsText(text: string): string {
  const accents: Record<string, string> = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U'
  };
  
  let sanitized = text.split('').map(char => accents[char] || char).join('');
  
  // Caracteres no permitidos según documentación de la API:
  // ' ¡ ¿ \ º | { } [ ] ` ^ Ü € ? $ # á é í ó ú ñ
  const forbidden = /['¡¿\\º|{}[\]`^$#?€]/g;
  sanitized = sanitized.replace(forbidden, '');
  
  return sanitized;
}

/**
 * Sanitiza los números de teléfono para la API.
 * Solo permite dígitos y punto y coma (;).
 */
function sanitizePhoneNumbers(phones: string): string {
  // Eliminar todo lo que no sea número o punto y coma
  return phones.replace(/[^0-9;]/g, '');
}

/**
 * Servicio de envío de SMS utilizando la API de MassivaMovil.
 */
export async function sendSmsMassiva(
  telefonos: string,
  texto: string,
  grupo?: string
): Promise<SmsApiResponse | null> {
  const usuario = process.env.SMS_API_USER;
  const clave = process.env.SMS_API_PASSWORD;
  const url = 'https://www.sistema.massivamovil.com/webservices/SendSms';

  // console.log('[SMS_DEBUG] URL:', url);
  // console.log('[SMS_DEBUG] usuario configurado:', !!usuario);
  // console.log('[SMS_DEBUG] clave configurada:', !!clave);

  if (!usuario || !clave) {
    console.error('[SMS_ERROR] Credenciales de API de SMS no configuradas (SMS_API_USER, SMS_API_PASSWORD)');
    return null;
  }

  const textoSanitizado = sanitizeSmsText(texto);
  const telefonosSanitizados = sanitizePhoneNumbers(telefonos);

  // console.log('[SMS_DEBUG] texto original:', texto);
  // console.log('[SMS_DEBUG] texto sanitizado:', textoSanitizado);
  // console.log('[SMS_DEBUG] teléfono original:', telefonos);
  // console.log('[SMS_DEBUG] teléfono sanitizado:', telefonosSanitizados);

  try {
    const bodyParams = new URLSearchParams();
    bodyParams.append('usuario', usuario);
    bodyParams.append('clave', clave);
    bodyParams.append('texto', textoSanitizado);
    bodyParams.append('telefonos', telefonosSanitizados);
    bodyParams.append('api', 'json');
    if (grupo) {
      bodyParams.append('grupo', grupo);
    }

    // console.log('[SMS_DEBUG] bodyParams.toString():', bodyParams.toString());

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams,
    });

    // console.log('[SMS_DEBUG] response.status:', response.status);
    // console.log('[SMS_DEBUG] response.statusText:', response.statusText);

    const result: SmsApiResponse = await response.json();
    // console.log('[SMS_DEBUG] response body:', JSON.stringify(result));

    if (result.error || result.statusCode) {
      console.error('❌ [SMS_API_ERROR] Error reportado por la API:', result.error || result.mensaje);
      return result;
    }

    if (result.status && Number(result.status) > 0) {
      // console.log('✅ [SMS_SUCCESS] SMS enviado con éxito:', result);
      return result;
    }

    console.error('❌ [SMS_API_ERROR] Respuesta inesperada:', result);
    return result;
  } catch (error) {
    console.error('🚨 [SMS_CRITICAL_ERROR] Error en el proceso de envío de SMS:', error);
    return null;
  }
}
