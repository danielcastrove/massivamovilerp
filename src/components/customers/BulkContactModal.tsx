"use client";

import { useEffect, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageSquare, Phone, Mail, Users, CheckCircle2, XCircle } from "lucide-react";

export type BulkCanal = "SMS" | "WHATSAPP" | "EMAIL";
export type BulkDestino = "principal" | "contacto" | "cobranza";

export interface BulkEntity {
  id: string;
  name: string;
}

interface BulkResult {
  total: number;
  enviados: number;
  fallidos: number;
  sin_destino: number;
  detalles: Array<{ id: string; name: string; ok: boolean; detalle: string }>;
}

interface BulkContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: BulkEntity[];
  apiEntity: "customers" | "leads";
  destinos: BulkDestino[];
  onFinished?: () => void;
}

const canalConfig = {
  SMS: { label: "SMS", icon: MessageSquare, color: "text-blue-600", bgColor: "bg-blue-50", btnColor: "bg-blue-600 hover:bg-blue-700", maxLength: 160 },
  WHATSAPP: { label: "WhatsApp", icon: Phone, color: "text-emerald-600", bgColor: "bg-emerald-50", btnColor: "bg-emerald-600 hover:bg-emerald-700", maxLength: 1000 },
  EMAIL: { label: "Email", icon: Mail, color: "text-violet-600", bgColor: "bg-violet-50", btnColor: "bg-violet-600 hover:bg-violet-700", maxLength: null },
} as const;

const destinoLabels: Record<BulkDestino, string> = {
  principal: "Contacto principal",
  contacto: "Persona de contacto",
  cobranza: "Persona de cobranza",
};

export default function BulkContactModal({
  isOpen,
  onClose,
  entities,
  apiEntity,
  destinos,
  onFinished,
}: BulkContactModalProps) {
  const [channel, setChannel] = useState<BulkCanal>("SMS");
  const [destino, setDestino] = useState<BulkDestino>(destinos[0] || "principal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ref para no resetear el formulario cuando el padre recrea el array de destinos en cada render
  const destinosRef = useRef(destinos);
  destinosRef.current = destinos;

  // Reiniciar al abrir
  useEffect(() => {
    if (isOpen) {
      setChannel("SMS");
      setDestino(destinosRef.current[0] || "principal");
      setSubject("");
      setMessage("");
      setResult(null);
      setError(null);
      setSending(false);
    }
  }, [isOpen]);

  const cfg = canalConfig[channel];
  const maxLength = cfg.maxLength;
  const excedeLimite = maxLength !== null && message.length > maxLength;
  const puedeEnviar = entities.length > 0 && message.trim().length > 0 && (channel !== "EMAIL" || subject.trim().length > 0) && !excedeLimite;

  const handleSend = async () => {
    if (!puedeEnviar || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/bulk-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: apiEntity,
          ids: entities.map((e) => e.id),
          channel,
          destino,
          message,
          subject: channel === "EMAIL" ? subject : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "No se pudo enviar el mensaje general.");
      }
      setResult(data as BulkResult);
      onFinished?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  };

  const fallidos = result?.detalles.filter((d) => !d.ok) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !sending && !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
            <span className={`p-2 rounded-lg ${cfg.bgColor}`}>
              <cfg.icon className={`h-5 w-5 ${cfg.color}`} />
            </span>
            Mensaje General
          </DialogTitle>
          <DialogDescription>
            Envía un mismo mensaje a todos los destinatarios de la lista filtrada ({entities.length}{" "}
            {entities.length === 1 ? "destinatario" : "destinatarios"}).
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <div className={`flex items-center gap-2 p-3 rounded-lg ${result.enviados > 0 ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-600"}`}>
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-bold text-sm">
                {result.enviados} de {result.total} mensajes enviados correctamente.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-red-50">
                <div className="text-lg font-black text-red-600">{result.fallidos}</div>
                <div className="text-[10px] font-bold uppercase text-red-500">Con error de envío</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-lg font-black text-slate-600">{result.sin_destino}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Sin destino / omitidos</div>
              </div>
            </div>
            {fallidos.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-3">
                {fallidos.map((d) => (
                  <div key={d.id} className="flex items-start gap-2 text-xs text-slate-600">
                    <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold">{d.name}</span> — {d.detalle}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={onClose} className={cfg.btnColor}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-500">Canal</span>
                <Select value={channel} onValueChange={(v) => setChannel(v as BulkCanal)} disabled={sending}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-500">Enviar a</span>
                <Select value={destino} onValueChange={(v) => setDestino(v as BulkDestino)} disabled={sending}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Destinatario" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinos.map((d) => (
                      <SelectItem key={d} value={d}>{destinoLabels[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {channel === "EMAIL" && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase text-slate-500">Asunto</span>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Asunto del correo..."
                  disabled={sending}
                  className="h-10"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Mensaje</span>
                {maxLength !== null && (
                  <span className={`text-[10px] font-mono ${excedeLimite ? "text-red-600 font-bold" : "text-slate-400"}`}>
                    {message.length}/{maxLength}
                  </span>
                )}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={channel === "EMAIL" ? "Cuerpo del correo..." : "Texto del mensaje..."}
                className="min-h-[120px] resize-y"
                disabled={sending}
              />
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <Users className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-[11px] text-slate-600">
                Se enviará <Badge variant="outline" className="mx-1 font-bold">{entities.length}</Badge>
                {channel === "SMS" ? " SMS" : channel === "WHATSAPP" ? " mensajes de WhatsApp" : " correos"} a la {destinoLabels[destino].toLowerCase()} de cada destinatario de la lista filtrada. Los destinatarios repetidos o sin dato se omiten.
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">{error}</div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={sending}>Cancelar</Button>
              <Button onClick={handleSend} disabled={!puedeEnviar || sending} className={cfg.btnColor}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
                  </>
                ) : (
                  `Enviar a ${entities.length} ${entities.length === 1 ? "destinatario" : "destinatarios"}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
