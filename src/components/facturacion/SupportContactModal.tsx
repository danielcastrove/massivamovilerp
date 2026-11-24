"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, MessageSquare, MessageCircle, CheckCircle2, Headphones } from "lucide-react";

export type SupportChannel = "EMAIL" | "SMS" | "WHATSAPP";

interface SupportContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoice_number?: number;
    customer: { name: string; doc_number: string };
  };
  initialChannel?: SupportChannel;
  onSent?: () => void;
}

const channelConfig: Record<
  SupportChannel,
  { label: string; icon: typeof Mail; maxLength: number | null; btnColor: string; placeholder: string }
> = {
  EMAIL: {
    label: "Email",
    icon: Mail,
    maxLength: null,
    btnColor: "bg-violet-600 hover:bg-violet-700",
    placeholder: "Escribe tu consulta o mensaje...",
  },
  SMS: {
    label: "SMS",
    icon: MessageSquare,
    maxLength: 160,
    btnColor: "bg-blue-600 hover:bg-blue-700",
    placeholder: "Escribe tu mensaje (máx. 160 caracteres)...",
  },
  WHATSAPP: {
    label: "WhatsApp",
    icon: MessageCircle,
    maxLength: 1000,
    btnColor: "bg-emerald-600 hover:bg-emerald-700",
    placeholder: "Escribe tu mensaje...",
  },
};

const SUBJECT_DEFAULT = "Contacto de cliente - Facturación MassivaMovil";

export default function SupportContactModal({
  isOpen,
  onClose,
  invoice,
  initialChannel = "EMAIL",
  onSent,
}: SupportContactModalProps) {
  const [channel, setChannel] = useState<SupportChannel>(initialChannel);
  const [subject, setSubject] = useState(SUBJECT_DEFAULT);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg = channelConfig[channel];
  const excedeLimite = cfg.maxLength !== null && message.length > cfg.maxLength;
  const puedeEnviar = message.trim().length > 0 && !excedeLimite && (channel !== "EMAIL" || subject.trim().length > 0);

  const invoiceLabel = invoice.invoice_number
    ? `#${String(invoice.invoice_number).padStart(6, "0")}`
    : `#${invoice.id.slice(0, 8)}`;

  const handleSend = async () => {
    if (!puedeEnviar || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          message,
          subject: channel === "EMAIL" ? subject : undefined,
          invoiceNumber: invoice.invoice_number ?? undefined,
          customerName: invoice.customer.name,
          customerDoc: invoice.customer.doc_number,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "No se pudo enviar el mensaje al equipo de soporte.");
      }
      setSent(true);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    setChannel(initialChannel);
    setSubject(SUBJECT_DEFAULT);
    setMessage("");
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
            <span className="p-2 rounded-lg bg-cyan-50">
              <Headphones className="h-5 w-5 text-cyan-600" />
            </span>
            Contactar a Soporte
          </DialogTitle>
          <DialogDescription>
            Factura <span className="font-mono font-bold text-slate-700">{invoiceLabel}</span> · Tu mensaje
            llegará al equipo de MassivaMovil por {cfg.label}.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-bold text-sm">Mensaje enviado al equipo de soporte.</span>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className={cfg.btnColor}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase text-slate-500">Canal</span>
              <Select value={channel} onValueChange={(v) => setChannel(v as SupportChannel)} disabled={sending}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {channel === "EMAIL" && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-500">Asunto</span>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sending}
                  className="h-10"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Mensaje</span>
                {cfg.maxLength !== null && (
                  <span
                    className={`text-[10px] font-mono ${
                      excedeLimite ? "text-red-600 font-bold" : "text-slate-400"
                    }`}
                  >
                    {message.length}/{cfg.maxLength}
                  </span>
                )}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={cfg.placeholder}
                className="min-h-[120px] resize-y"
                disabled={sending}
              />
              <p className="text-[11px] text-slate-400">
                Se enviará con tus datos ({invoice.customer.name}
                {invoice.customer.doc_number ? ` · ${invoice.customer.doc_number}` : ""}) y el número de factura.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">{error}</div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={sending}>Cancelar</Button>
              <Button onClick={handleSend} disabled={!puedeEnviar || sending} className={cfg.btnColor}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <cfg.icon className="h-4 w-4 mr-2" /> Enviar por {cfg.label}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
