export const EMAIL_TEMPLATE_TYPES = [
  "general",
  "payment_reminder",
  "service_reminder",
  "payment_confirmation",
] as const;

export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export interface EmailTemplateMeta {
  /** Etiqueta para el selector de la UI */
  label: string;
  /** Asunto por defecto del correo */
  subject: string;
  /** Título visible en la cabecera del correo */
  title: string;
  /** Color de la variante (barra de cabecera) */
  color: string;
  /** Mensaje modelo (editable) para prefill en los modales */
  model: string;
  /** Descripción corta para la UI */
  hint: string;
}

export const EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplateMeta> = {
  general: {
    label: "Contacto general",
    subject: "Contacto - MassivaMovil",
    title: "Mensaje de MassivaMovil",
    color: "#6d28d9",
    model: "",
    hint: "Correo libre con la plantilla institucional.",
  },
  payment_reminder: {
    label: "Recordatorio de pago",
    subject: "Recordatorio de Pago - MassivaMovil",
    title: "Recordatorio de Pago",
    color: "#d97706",
    model:
      "Estimado cliente, le recordamos que tiene un pago pendiente. Agradecemos su pronta gestión para mantener sus servicios activos. Si ya realizó el pago, por favor ignore este mensaje.",
    hint: "Cobranza: aviso de pago pendiente.",
  },
  service_reminder: {
    label: "Vencimiento de servicio",
    subject: "Recordatorio de Vencimiento - MassivaMovil",
    title: "Recordatorio de Vencimiento",
    color: "#ea580c",
    model:
      "Estimado cliente, le informamos que uno de sus servicios está próximo a vencer. Comuníquese con nosotros para renovarlo y evitar interrupciones en el servicio.",
    hint: "Aviso de servicio por vencer o vencido.",
  },
  payment_confirmation: {
    label: "Confirmación de pago",
    subject: "Confirmación de Pago - MassivaMovil",
    title: "Hemos Recibido Su Pago",
    color: "#059669",
    model:
      "Estimado cliente, hemos recibido exitosamente su pago. Gracias por su confianza en MassivaMovil.",
    hint: "Agradece un pago recibido.",
  },
};

export function isEmailTemplateType(value: unknown): value is EmailTemplateType {
  return typeof value === "string" && (EMAIL_TEMPLATE_TYPES as readonly string[]).includes(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Convierte texto plano del usuario en HTML seguro (escapado + saltos de línea). */
export function emailMessageToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br/>");
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://massivamovilerp.vercel.app";
}

function getSupportEmail(): string {
  return process.env.EMAIL_FROM_ADDRESS || "erp@massivamovil.com";
}

/**
 * Envuelve el contenido en la plantilla institucional MassivaMovil:
 * logo/isologo, barra de color según el objetivo del correo, título,
 * firma y pie con aviso de correo automático.
 */
export function buildBrandEmail({
  type = "general",
  bodyHtml,
}: {
  type?: EmailTemplateType;
  bodyHtml: string;
}): string {
  const meta = EMAIL_TEMPLATES[type] || EMAIL_TEMPLATES.general;
  const logoUrl = `${getBaseUrl()}/massivamovil.png`;
  const supportEmail = getSupportEmail();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f0f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f0f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td align="center" style="background-color:${meta.color};padding:24px 32px;">
              <img src="${logoUrl}" alt="MassivaMovil" width="160" style="display:block;margin:0 auto 14px;width:160px;max-width:100%;height:auto;border:0;background-color:#ffffff;padding:10px 16px;border-radius:8px;" />
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.3px;">${escapeHtml(meta.title)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 4px;">
              <div style="font-size:15px;line-height:1.6;color:#1f2937;">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 28px;">
              <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.5;">
                Atentamente,<br />
                <strong style="color:#1f2937;">Equipo MassivaMovil</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                MassivaMovil ERP &middot; ${escapeHtml(supportEmail)}<br />
                Este correo fue generado autom&aacute;ticamente por el sistema MassivaMovil ERP. No responda a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
