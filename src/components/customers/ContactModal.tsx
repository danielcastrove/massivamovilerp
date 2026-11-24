"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LIMITE_TEXTO_WHATSAPP } from "@/lib/whatsapp-firma";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Loader2, MessageSquare, Phone, Mail, Pencil, Trash2, Check, X } from "lucide-react";
import {
  buildContactOptions,
  parseContactosExtra,
  normalizeValor,
  isValidEmail,
  isValidPhone,
  type ContactoExtra,
  type ContactoFuente,
  type ContactoOpcion,
  type ContactoTipo,
} from "@/lib/contacts";
import {
  EMAIL_TEMPLATE_TYPES,
  EMAIL_TEMPLATES,
  type EmailTemplateType,
} from "@/lib/email-templates";

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
  nombre?: string | null;
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
    maxLength: LIMITE_TEXTO_WHATSAPP,
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

type Channel = "SMS" | "WHATSAPP" | "EMAIL";

function construirOpciones(
  entity: ContactEntity,
  channel: Channel,
  extras: ContactoExtra[],
  preferSources?: ContactoFuente[]
): ContactoOpcion[] {
  const pci = entity.persona_contacto_info as InfoContactoJson | undefined;
  const cob = entity.persona_cobranza_info as InfoContactoJson | undefined;
  const base =
    channel === "EMAIL"
      ? buildContactOptions(
          [
            { valor: entity.email, fuente: "principal", nombre: entity.name },
            { valor: pci?.email, fuente: "contacto", nombre: pci?.nombre },
            { valor: cob?.email, fuente: "cobranza", nombre: cob?.nombre },
          ],
          "EMAIL",
          extras
        )
      : buildContactOptions(
          [
            { valor: entity.telefono_empresa, fuente: "principal", nombre: entity.name },
            { valor: entity.telefono_celular, fuente: "principal", nombre: entity.name },
            { valor: pci?.telefono, fuente: "contacto", nombre: pci?.nombre },
            { valor: pci?.telefono_celular, fuente: "contacto", nombre: pci?.nombre },
            { valor: cob?.telefono, fuente: "cobranza", nombre: cob?.nombre },
          ],
          "PHONE",
          extras
        );
  if (!preferSources || preferSources.length === 0) return base;
  const rank = (fuente: ContactoFuente) => {
    const i = preferSources.indexOf(fuente);
    return i === -1 ? preferSources.length : i;
  };
  return [...base].sort((a, b) => rank(a.fuente) - rank(b.fuente));
}

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
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateType>("general");

  // Defaults aplicados por la última plantilla: si el usuario no los tocó,
  // al cambiar de plantilla se reemplazan; si los editó, se conservan.
  const prevDefaultsRef = useRef({ subject: "", model: "" });

  const config = channelConfig[channel];
  const Icon = config.icon;
  const maxLength = config.maxLength;

  const isEditable = channel === "EMAIL" || channel === "SMS";

  const extraTipo: ContactoTipo = channel === "EMAIL" ? "EMAIL" : "PHONE";

  const [contactosExtra, setContactosExtra] = useState<ContactoExtra[]>(() =>
    parseContactosExtra(entity.contactos_extra)
  );
  const [editingValor, setEditingValor] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ContactoExtra | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const extrasVisibles = useMemo(
    () => contactosExtra.filter((c) => c.tipo === extraTipo),
    [contactosExtra, extraTipo]
  );

  const opciones = useMemo(
    () => construirOpciones(entity, channel, contactosExtra, preferSources),
    [channel, entity, contactosExtra, preferSources]
  );

  useEffect(() => {
    if (!isOpen) return;
    const extras = parseContactosExtra(entity.contactos_extra);
    setContactosExtra(extras);
    setRecipientMode("select");
    setCustomValor("");
    setSaveContact(true);
    setEditingValor(null);
    setEditInput("");
    setActionError(null);
    setPendingDelete(null);
    setEmailTemplate("general");
    prevDefaultsRef.current = { subject: "", model: "" };
    const opcionesIniciales = isEditable ? construirOpciones(entity, channel, extras, preferSources) : [];
    const preferida = preferSources?.length
      ? opcionesIniciales.find((op) => preferSources.includes(op.fuente))
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

  const destinoInfo = useMemo(() => {
    const valor = sentTo || recipient;
    if (!valor) return null;
    const key = normalizeValor(valor, extraTipo);
    if (!key) return null;
    const op = opciones.find((o) => normalizeValor(o.valor, extraTipo) === key);
    return op ? { nombre: op.nombre, fuente: op.fuente } : null;
  }, [sentTo, recipient, opciones, extraTipo]);

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

  const aplicarTemplate = (next: EmailTemplateType) => {
    const meta = EMAIL_TEMPLATES[next];
    const prev = prevDefaultsRef.current;
    const currentSubject = (form.getValues("subject") as string) || "";
    const currentMessage = (form.getValues("message") as string) || "";
    if (currentSubject === "" || currentSubject === prev.subject) {
      form.setValue("subject", meta.subject, { shouldValidate: true });
    }
    if (currentMessage === "" || currentMessage === prev.model) {
      form.setValue("message", meta.model, { shouldValidate: true });
    }
    prevDefaultsRef.current = { subject: meta.subject, model: meta.model };
    setEmailTemplate(next);
  };

  async function onSubmit(values: ContactFormValues) {
    setLoading(true);
    setError(null);
    try {
      const url = apiBase ? `${apiBase}/${entity.id}/contact` : `/api/customers/${entity.id}/contact`;
      const body: Record<string, unknown> = {
        channel,
        message: values.message,
        subject: values.subject || undefined,
        template: channel === "EMAIL" ? emailTemplate : undefined,
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

  function contactosExtraUrl(): string {
    const base = apiBase || "/api/customers";
    return `${base}/${entity.id}/contactos-extra`;
  }

  async function contactosExtraRequest(method: "PATCH" | "DELETE", payload: Record<string, unknown>): Promise<{ contactos_extra: unknown }> {
    const res = await fetch(contactosExtraUrl(), {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al actualizar el contacto.");
    return data;
  }

  function aplicarCambioExtras(nuevos: unknown, valorAnterior: string | null, valorNuevo: string | null) {
    const lista = parseContactosExtra(nuevos);
    setContactosExtra(lista);
    if (recipientMode !== "select" || !valorAnterior) return;
    if (normalizeValor(selectedValor, extraTipo) !== normalizeValor(valorAnterior, extraTipo)) return;
    if (valorNuevo) {
      setSelectedValor(valorNuevo);
      return;
    }
    const opcionesNuevas = construirOpciones(entity, channel, lista, preferSources);
    const preferida = preferSources?.length
      ? opcionesNuevas.find((op) => preferSources.includes(op.fuente))
      : undefined;
    const recipientBase = getRecipient(entity, channel);
    const existeRecipient = recipientBase
      ? opcionesNuevas.some((op) => normalizeValor(op.valor, extraTipo) === normalizeValor(recipientBase, extraTipo))
      : false;
    setSelectedValor(preferida?.valor ?? (existeRecipient ? recipientBase : opcionesNuevas[0]?.valor ?? ""));
  }

  function startEdit(c: ContactoExtra) {
    setEditingValor(c.valor);
    setEditInput(c.valor);
    setActionError(null);
  }

  function cancelEdit() {
    setEditingValor(null);
    setEditInput("");
    setActionError(null);
  }

  async function saveEdit() {
    if (!editingValor) return;
    const nuevo = editInput.trim();
    if (!nuevo) {
      setActionError("El valor no puede estar vacío.");
      return;
    }
    if (extraTipo === "EMAIL" ? !isValidEmail(nuevo) : !isValidPhone(nuevo)) {
      setActionError(
        extraTipo === "EMAIL" ? "Ingresa un correo válido." : "Ingresa un teléfono válido (7 a 15 dígitos)."
      );
      return;
    }
    setEditSaving(true);
    setActionError(null);
    try {
      const data = await contactosExtraRequest("PATCH", {
        tipo: extraTipo,
        valor: editingValor,
        nuevoValor: nuevo,
      });
      aplicarCambioExtras(data.contactos_extra, editingValor, nuevo);
      cancelEdit();
      onSuccess?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al actualizar el contacto.");
    } finally {
      setEditSaving(false);
    }
  }

  async function executeDelete() {
    if (!pendingDelete) return;
    setDeleteSaving(true);
    setActionError(null);
    try {
      const data = await contactosExtraRequest("DELETE", {
        tipo: pendingDelete.tipo,
        valor: pendingDelete.valor,
      });
      aplicarCambioExtras(data.contactos_extra, pendingDelete.valor, null);
      setPendingDelete(null);
      onSuccess?.();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al eliminar el contacto.");
    } finally {
      setDeleteSaving(false);
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
    setEditingValor(null);
    setEditInput("");
    setActionError(null);
    setPendingDelete(null);
    setEmailTemplate("general");
    prevDefaultsRef.current = { subject: "", model: "" };
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
              {destinoInfo && (
                <>
                  {" — "}
                  {destinoInfo.nombre ? (
                    <>
                      <strong>{destinoInfo.nombre}</strong> ({fuenteLabels[destinoInfo.fuente]})
                    </>
                  ) : (
                    <>({fuenteLabels[destinoInfo.fuente]})</>
                  )}
                </>
              )}
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
                              {op.nombre && (
                                <span className="ml-2 text-[10px] text-slate-500 truncate">{op.nombre}</span>
                              )}
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

                  {extrasVisibles.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Contactos extra</p>
                      {extrasVisibles.map((c) => (
                        <div
                          key={`${c.tipo}-${c.valor}`}
                          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5"
                        >
                          {editingValor === c.valor ? (
                            <>
                              <Input
                                value={editInput}
                                onChange={(e) => setEditInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    saveEdit();
                                  }
                                }}
                                placeholder={extraTipo === "EMAIL" ? "correo@ejemplo.com" : "0412-1234567"}
                                className="h-7 text-xs flex-1"
                                autoFocus
                                disabled={editSaving}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                                onClick={saveEdit}
                                disabled={editSaving}
                                title="Guardar cambios"
                              >
                                {editSaving ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-500"
                                onClick={cancelEdit}
                                disabled={editSaving}
                                title="Cancelar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 truncate text-xs text-slate-700">{c.valor}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-slate-600"
                                onClick={() => startEdit(c)}
                                disabled={editSaving || deleteSaving}
                                title="Editar contacto"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-400 hover:text-red-600"
                                onClick={() => {
                                  setPendingDelete(c);
                                  setActionError(null);
                                }}
                                disabled={editSaving || deleteSaving}
                                title="Eliminar contacto"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                      {actionError && !pendingDelete && (
                        <p className="text-[11px] text-red-600">{actionError}</p>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400">
                    {entity.name} — {entity.doc_number}
                  </p>
                </div>

                {/* Tipo de correo + Asunto (solo email) */}
                {channel === "EMAIL" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold uppercase text-slate-400">Tipo de correo</span>
                      <Select value={emailTemplate} onValueChange={(v) => aplicarTemplate(v as EmailTemplateType)} disabled={loading}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Tipo de correo" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMAIL_TEMPLATE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {EMAIL_TEMPLATES[t].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-slate-400">{EMAIL_TEMPLATES[emailTemplate].hint}</p>
                    </div>

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
                  </div>
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

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && !deleteSaving && setPendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este contacto extra?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{pendingDelete?.valor}</strong> de los contactos{" "}
              {pendingDelete?.tipo === "EMAIL" ? "de correo" : "telefónicos"} de {entity.name}. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError && <p className="text-xs text-red-600">{actionError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteSaving}
              onClick={(e) => {
                e.preventDefault();
                executeDelete();
              }}
            >
              {deleteSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
