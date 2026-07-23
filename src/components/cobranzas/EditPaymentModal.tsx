"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Hash, FileText, Save } from "lucide-react";
import NotificationModal from "@/components/ui/notification-modal";

const editPaymentSchema = z.object({
  amountPaid: z.number().min(0.01, "El monto debe ser mayor a 0"),
  currency: z.enum(["USD", "BS"]),
  exchangeRate: z.number().min(1),
  paymentMethod: z.string().min(1, "Seleccione un método"),
  reference: z.string().optional(),
  evidenceUrl: z.string().url("Debe ser una URL válida").or(z.literal("")).optional(),
  paymentDate: z.string().min(1, "La fecha es requerida"),
  notes: z.string().optional(),
});

type EditPaymentFormValues = z.infer<typeof editPaymentSchema>;

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  onSuccess: () => void;
}

export default function EditPaymentModal({ isOpen, onClose, payment, onSuccess }: EditPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const form = useForm<EditPaymentFormValues>({
    resolver: zodResolver(editPaymentSchema),
    defaultValues: {
      amountPaid: 0,
      currency: "USD",
      exchangeRate: 1,
      paymentMethod: "",
      reference: "",
      evidenceUrl: "",
      paymentDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen && payment) {
      form.reset({
        amountPaid: Number(payment.amount_paid),
        currency: (payment.currency as "USD" | "BS") || "USD",
        exchangeRate: Number(payment.exchange_rate),
        paymentMethod: payment.payment_method,
        reference: payment.reference || "",
        evidenceUrl: payment.evidence_url || "",
        paymentDate: new Date(payment.payment_date).toISOString().split('T')[0],
        notes: payment.notes || "",
      });
    }
  }, [isOpen, payment, form]);

  async function onSubmit(values: EditPaymentFormValues) {
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        setNotification({
          isOpen: true,
          title: "¡Actualizado!",
          message: "El registro de pago ha sido actualizado correctamente.",
          type: "success"
        });
      } else {
        const error = await response.json();
        setNotification({
          isOpen: true,
          title: "Error",
          message: error.message || "Error al actualizar el pago",
          type: "error"
        });
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      setNotification({
        isOpen: true,
        title: "Error de Red",
        message: "No se pudo conectar con el servidor.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  const handleNotificationClose = () => {
    const isSuccess = notification.type === "success";
    setNotification({ ...notification, isOpen: false });
    if (isSuccess) {
      onSuccess();
      onClose();
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 overflow-hidden border-slate-200 shadow-2xl flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Pencil className="h-5 w-5" />
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Editar Registro de Pago</DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 text-xs">
            Modifique los datos del pago de {payment.customer?.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Moneda</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 border-slate-200 font-bold">
                              <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">Dólares ($)</SelectItem>
                            <SelectItem value="BS">Bolívares (Bs)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amountPaid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Monto</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                              {form.watch("currency") === "USD" ? "$" : "Bs"}
                            </span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              className="pl-8 h-10 border-slate-200 font-mono font-bold text-slate-900" 
                              {...field} 
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Método</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 border-slate-200">
                              <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ZELLE">Zelle</SelectItem>
                            <SelectItem value="TRANSFERENCIA_BS">Transferencia Bs</SelectItem>
                            <SelectItem value="PAGO_MOVIL">Pago Móvil</SelectItem>
                            <SelectItem value="EFECTIVO_USD">Efectivo USD</SelectItem>
                            <SelectItem value="EFECTIVO_BS">Efectivo Bs</SelectItem>
                            <SelectItem value="CUSTODIA">Custodia / Otros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Referencia</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input className="pl-9 h-10 border-slate-200" {...field} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Fecha</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-10 border-slate-200" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exchangeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Tasa (BCV)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.0001" 
                            className="h-10 border-slate-200 font-mono text-xs" 
                            {...field} 
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="evidenceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400">URL Comprobante</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <Input className="pl-9 h-10 border-slate-200" placeholder="https://..." {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Notas</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="resize-none border-slate-200 text-xs h-20" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
            </div>

            <DialogFooter className="p-6 pt-2 border-t border-slate-100 bg-slate-50/50">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 px-8" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>

        <NotificationModal 
          isOpen={notification.isOpen}
          onClose={handleNotificationClose}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />
      </DialogContent>
    </Dialog>
  );
}
