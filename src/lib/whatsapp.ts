
import axios from 'axios';

/**
 * Servicio de envío de WhatsApp utilizando la API de MassivaMovil.
 */
export async function sendWhatsAppMassiva(recipient: string, message: string) {
  // console.log('whatsapp');
  const secret = process.env.WHATSAPP_API_SECRET;
  const account = process.env.WHATSAPP_API_ACCOUNT;
  const url = "https://whatsapp.massivamovil.com/api/send/whatsapp";

  if (!secret || !account) {
    // console.error('[WHATSAPP_ERROR] Credenciales de API de WhatsApp no configuradas (WHATSAPP_API_SECRET, WHATSAPP_API_ACCOUNT)');
    return null;
  }

  // Limpiar solo dígitos (quita +, espacios, guiones, etc.)
  let formattedRecipient = recipient.replace(/\D/g, '');

  // Si no tiene código de país (58), agregarlo (asume Venezuela)
  if (!formattedRecipient.startsWith('58')) {
    if (formattedRecipient.length === 10 || formattedRecipient.length === 11) {
      formattedRecipient = '58' + (formattedRecipient.startsWith('0') ? formattedRecipient.slice(1) : formattedRecipient);
    }
  }

  try {
    const bodyParams = new URLSearchParams();
    bodyParams.append('secret', secret);
    bodyParams.append('account', account);
    bodyParams.append('recipient', formattedRecipient);
    bodyParams.append('type', 'text');
    bodyParams.append('priority', '2');
    bodyParams.append('message', message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams,
    });

    const result = await response.json();

    if (response.ok && (result.status === 200 || result.status === "200")) {
      // console.log('✅ [WHATSAPP_SUCCESS] WhatsApp enviado con éxito:', result);
      return result;
    } else {
      // console.error('❌ [WHATSAPP_API_ERROR] Error reportado por la API:', result);
      return result;
    }
  } catch (error) {
    // console.error('🚨 [WHATSAPP_CRITICAL_ERROR] Error en el proceso de envío de WhatsApp:', error);
    return null;
  }
}
