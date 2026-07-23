
import axios from 'axios';
import { sendSmsMassiva } from './sms';
import { sendWhatsAppMassiva } from './whatsapp';
import { sendEmail } from './email';

interface NotificationOptions {
  to: string; // Phone number for SMS/WA, Email for Email
  customerName: string;
  message: string;
  type: 'SMS' | 'WHATSAPP' | 'EMAIL';
  subject?: string; // Only for Email
}

/**
 * Utility to send multi-channel notifications via the configured external API.
 */
export async function sendNotification({ to, customerName, message, type, subject }: NotificationOptions) {
  // --- SPECIAL CASES: MassivaMovil Native APIs ---
  if (type === 'SMS') {
    return sendSmsMassiva(to, message);
  }
  
  if (type === 'WHATSAPP') {
    return sendWhatsAppMassiva(to, message);
  }

  if (type === 'EMAIL') {
    try {
        return await sendEmail({
            to,
            subject: subject || 'Notificación MassivaMovil ERP',
            html: message // Enviar el mensaje como HTML
        });
    } catch (error: any) {
        console.error(`[Notification Error] Failed to send EMAIL to ${to}:`, error.message);
        return null;
    }
  }

  return null;
}

/**
 * Specifically sends a payment confirmation across all requested channels.
 */
export async function sendPaymentConfirmation({ 
    toPhone, 
    toEmail, 
    customerName, 
    amount, 
    currency, 
    reference 
}: { 
    toPhone?: string; 
    toEmail?: string; 
    customerName: string; 
    amount: string | number; 
    currency: string;
    reference?: string;
}) {
    const amountStr = `${currency} ${Number(amount).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    const refStr = reference ? ` (Ref: ${reference})` : '';
    const message = `Hola ${customerName}, hemos recibido exitosamente tu pago de ${amountStr}${refStr}. Gracias por tu confianza en MassivaMovil.`;

    const notifications = [];

    if (toPhone) {
        notifications.push(sendNotification({
            to: toPhone,
            customerName,
            message,
            type: 'SMS'
        }));
        notifications.push(sendNotification({
            to: toPhone,
            customerName,
            message,
            type: 'WHATSAPP'
        }));
    }

    if (toEmail) {
        notifications.push(sendNotification({
            to: toEmail,
            customerName,
            message: `<p>${message}</p>`,
            type: 'EMAIL',
            subject: 'Confirmación de Pago - MassivaMovil'
        }));
    }

    return Promise.all(notifications);
}
