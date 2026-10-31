"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageSquare, Phone, Mail } from "lucide-react";
import {
  buildContactOptions,
  parseContactosExtra,
  isValidEmail,
  isValidPhone,
  type ContactoFuente,
} from "@/lib/contacts";

export interface ContactEntity {
  id: string;
  name: string;
  doc_number: string;
  email?: string | null;
  telefono_empresa?: string | null;
  telefono_celular?: string | null;
  persona_contacto_info?: any;
  persona_cobranza_info?: unknown;
  contactos_extra?: unknown;
}

interface InfoContactoJson {
  email?: string | null;
  telefono?: string | null;
  telefono_celular?: string | null;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: ContactEntity;
  channel: "SMS" | "WHATSAPP" | "EMAIL";
  apiBase?: string;
  onSuccess?: () => void;
  preferSources?: ContactoFuente[];
}

const channelConfig = {
  SMS: {
    title: "Enviar SMS",
    description: "Envía un mensaje de texto SMS al cliente.",
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    btnColor: "bg-blue-600 hover:bg-blue-700",
    maxLength: 160,
    label: "Enviar SMS",
  },
  WHATSAPP: {
    title: "Enviar WhatsApp",
    description: "Envía un mensaje de WhatsApp al cliente.",
    icon: Phone,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    btnColor: "bg-emerald-600 hover:bg-emerald-700",
    maxLength: 1000,
    label: "Enviar WhatsApp",
  },
  EMAIL: {
    title: "Enviar Email",
    description: "Envía un correo electrónico al cliente.",
    icon: Mail,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    btnColor: "bg-violet-600 hover:bg-violet-700",
    maxLength: null,
    label: "Enviar Email",
  },
} as const;

function getRecipient(entity: ContactEntity, channel: "SMS" | "WHATSAPP" | "EMAIL"): string {
  if (channel === "EMAIL") {
    return entity.email || (entity.persona_contacto_info as any)?.email || "";
  }
  const phone = entity.telefono_empresa || entity.telefono_celular || "";
  if (phone) return phone;
  const contactInfo = entity.persona_contacto_info as any;
  return contactInfo?.telefono || contactInfo?.telefono_celular || "";
}

const fuenteLabels: Record<ContactoFuente, string> = {
  principal: "principal",
  contacto: "persona de contacto",
  cobranza: "persona de cobranza",
  extra: "extra",
};

const CUSTOM_OPTION = "__custom__";

export function ContactModal({ isOpen, onClose, entity, channel, apiBase, onSuccess, preferSources }: ContactModalProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientMode, setRecipientMode] = useState<"select" | "custom">("select");
  const [selectedValor, setSelectedValor] = useState("");
  const [customValor, setCustomValor] = useState("");
  const [saveContact, setSaveContact] = useState(true);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const config = channelConfig[channel];
  const Icon = config.icon;
  const maxLength = config.maxLength;

  const isEditable = channel === "EMAIL" || channel === "SMS";

  const contactosExtra = useMemo(() => parseContactosExtra(entity.contactos_extra), [entity.contactos_extra]);

  const opciones = useMemo(() => {
    if (!isEditable) return [];
    const pci = entity.persona_contacto_info as InfoContactoJson | undefined;
    const cob = entity.persona_cobranza_info as InfoContactoJson | undefined;
    const base =
      channel === "EMAIL"
        ? buildContactOptions(
            [
              { valor: entity.email, fuente: "principal" },
              { valor: pci?.email, fuente: "contacto" },
              { valor: cob?.email, fuente: "cobranza" },
            ],
            "EMAIL",
            contactosExtra
          )
        : buildContactOptions(
            [
              { valor: entity.telefono_empresa, fuente: "principal" },
              { valor: entity.telefono_celular, fuente: "principal" },
              { valor: pci?.telefono, fuente: "contacto" },
              { valor: pci?.telefono_celular, fuente: "contacto" },
              { valor: cob?.telefono, fuente: "cobranza" },
            ],
            "PHONE",
            contactosExtra
          );
    if (!preferSources || preferSources.length === 0) return base;
    const rank = (fuente: ContactoFuente) => {
      const i = preferSources.indexOf(fuente);
      return i === -1 ? preferSources.length : i;
    };
    return [...base].sort((a, b) => rank(a.fuente) - rank(b.fuente));
  }, [channel, entity, contactosExtra, isEditable, preferSources]);

  useEffect(() => {
    if (!isOpen) return;
    setRecipientMode("select");
    setCustomValor("");
    setSaveContact(true);
    const preferida = preferSources?.length
      ? opciones.find((op) => preferSources.includes(op.fuente))
      : undefined;
    setSelectedValor(preferida?.valor ?? getRecipient(entity, channel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entity.id, channel]);

  const recipient = isEditable
    ? recipientMode === "custom"
      ? customValor.trim()
      : selectedValor
    : getRecipient(entity, channel);

  const customInvalid =
    isEditable &&
    recipientMode === "custom" &&
    customValor.trim().length > 0 &&
    (channel === "EMAIL" ? !isValidEmail(customValor) : !isValidPhone(customValor));

  const contactSchema = z.object({
    message: z.string().min(1, "El mensaje es requerido"),
    subject: channel === "EMAIL" ? z.string().min(1, "El asunto es requerido") : z.string().optional(),
  });

  type ContactFormValues = z.infer<typeof contactSchema>;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      message: "",
      subject: "",
    },
    mode: "onChange",
  });

  const watchedMessage = form.watch("message" as any);
  const charsLeft = maxLength !== null ? maxLength - (watchedMessage?.length || 0) : null;

  async function onSubmit(values: ContactFormValues) {
    setLoading(true);
    setError(null);
    try {
      const url = apiBase ? `${apiBase}/${entity.id}/contact` : `/api/customers/${entity.id}/contact`;
      const body: Record<string, unknown> = {
        channel,
        message: values.message,
        subject: values.subject || undefined,
      };
      if (isEditable) {
        body.to = recipient;
        body.save_contact = recipientMode === "custom" && saveContact;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al enviar.");
        return;
      }

      setSentTo(typeof data.recipient === "string" && data.recipient ? data.recipient : recipient);
      setSent(true);
      onSuccess?.();
    } catch {
      setError("Error de red al enviar.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSent(false);
    setError(null);
    setRecipientMode("select");
    setSelectedValor("");
    setCustomValor("");
    setSaveContact(true);
    setSentTo(null);
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <div className={`flex items-center gap-2 ${config.color} mb-1`}>
            <Icon className="h-5 w-5" />
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              {config.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 text-xs italic">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className={`p-3 rounded-full ${config.bgColor} mb-4`}>
              <Icon className={`h-8 w-8 ${config.color}`} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">¡Mensaje Enviado!</h3>
            <p className="text-sm text-slate-500">
              {channel} enviado exitosamente a <strong>{sentTo || recipient}</strong>
            </p>
            <Button
              onClick={handleClose}
              className={`mt-6 ${config.btnColor} text-white`}
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-1 py-2 space-y-4">
                {/* Destinatario */}
                <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3 space-y-2`}>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Enviando a</p>
                  {isEditable ? (
                    <>
                      <Select
                        value={recipientMode === "select" ? selectedValor || undefined : CUSTOM_OPTION}
                        onValueChange={(v) => {
                          if (v === CUSTOM_OPTION) {
                            setRecipientMode("custom");
                            setSelectedValor("");
                          } else {
                            setRecipientMode("select");
                            setSelectedValor(v);
                            setCustomValor("");
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm bg-white">
                          <SelectValue placeholder="Selecciona un contacto" />
                        </SelectTrigger>
                        <SelectContent>
                          {opciones.map((op) => (
                            <SelectItem key={op.valor} value={op.valor}>
                              <span className="truncate">{op.valor}</span>
                              <span className="ml-2 text-[10px] text-slate-400">({fuenteLabels[op.fuente]})</span>
                            </SelectItem>
                          ))}
                          <SelectItem value={CUSTOM_OPTION}>
                            Otro… (escribir otro {channel === "EMAIL" ? "correo" : "teléfono"})
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {recipientMode === "custom" && (
                        <div className="space-y-2">
                          <Input
                            value={customValor}
                            onChange={(e) => setCustomValor(e.target.value)}
                            placeholder={channel === "EMAIL" ? "correo@ejemplo.com" : "0412-1234567"}
                            className="h-9 text-sm bg-white"
                            autoFocus
                          />
                          {customInvalid && (
                            <p className="text-[11px] text-red-600">
                              {channel === "EMAIL"
                                ? "Ingresa un correo válido."
                                : "Ingresa un teléfono válido (7 a 15 dígitos)."}
                            </p>
                          )}
                          <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <Checkbox
                              checked={saveContact}
                              onCheckedChange={(v) => setSaveContact(v === true)}
                            />
                            <span className="text-xs text-slate-600">Guardar como contacto extra</span>
                          </label>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className={`text-sm font-bold ${config.color}`}>
                      {recipient || "Sin número/email registrado"}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {entity.name} — {entity.doc_number}
                  </p>
                </div>

                {/* Asunto (solo email) */}
                {channel === "EMAIL" && (
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-400">Asunto</FormLabel>
                        <FormControl>
                          <Input placeholder="Asunto del correo" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Mensaje */}
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-bold uppercase text-slate-400">Mensaje</FormLabel>
                        {charsLeft !== null && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              charsLeft < 0
                                ? "border-red-300 text-red-600 bg-red-50"
                                : charsLeft < 20
                                ? "border-amber-300 text-amber-600 bg-amber-50"
                                : "border-slate-200 text-slate-500"
                            }`}
                          >
                            {charsLeft} restantes
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder={
                            channel === "SMS"
                              ? "Escribe tu mensaje de texto..."
                              : channel === "WHATSAPP"
                              ? "Escribe tu mensaje de WhatsApp..."
                              : "Escribe el contenido del correo..."
                          }
                          className="text-sm min-h-[120px] resize-none"
                          maxLength={maxLength ?? undefined}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3">
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t mt-auto">
                <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !recipient || customInvalid || (charsLeft !== null && charsLeft < 0)}
                  className={`${config.btnColor} text-white min-w-[120px]`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando...
                    </>
                  ) : (
                    config.label
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
