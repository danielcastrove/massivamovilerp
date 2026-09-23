"use client";

import { useState } from "react";
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
import { Loader2, MessageSquare, Phone, Mail } from "lucide-react";

export interface ContactEntity {
  id: string;
  name: string;
  doc_number: string;
  email?: string | null;
  telefono_empresa?: string | null;
  telefono_celular?: string | null;
  persona_contacto_info?: any;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: ContactEntity;
  channel: "SMS" | "WHATSAPP" | "EMAIL";
  apiBase?: string;
  onSuccess?: () => void;
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

export function ContactModal({ isOpen, onClose, entity, channel, apiBase, onSuccess }: ContactModalProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = channelConfig[channel];
  const Icon = config.icon;
  const recipient = getRecipient(entity, channel);
  const maxLength = config.maxLength;

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
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          message: values.message,
          subject: values.subject || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al enviar.");
        return;
      }

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
              {channel} enviado exitosamente a <strong>{recipient}</strong>
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
                <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3`}>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Enviando a</p>
                  <p className={`text-sm font-bold ${config.color}`}>
                    {recipient || "Sin número/email registrado"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
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
                  disabled={loading || !recipient || (charsLeft !== null && charsLeft < 0)}
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
