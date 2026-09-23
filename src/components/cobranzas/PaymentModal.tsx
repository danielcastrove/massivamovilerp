"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, CreditCard, DollarSign, Calendar, Hash, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { differenceInDays } from "date-fns";

const paymentSchema = z.object({
  type: z.enum(["FACTURA", "RECIBO"]),
  amountPaid: z.number().min(0.01, "El monto debe ser mayor a 0"),
  currency: z.enum(["USD", "BS"]),
  exchangeRate: z.number().min(1),
  paymentMethod: z.string().min(1, "Seleccione un mtodo"),
  reference: z.string().optional(),
  evidenceUrl: z.string().url("Debe ser una URL vlida").or(z.literal("")).optional(),
  paymentDate: z.string().min(1, "La fecha es requerida"),
  notes: z.string().optional(),
  appliedInvoiceIds: z.array(z.string()).min(1, "Seleccione al menos un servicio/factura para pagar"),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  bcvRate: number;
  onSuccess: () => void;
  initialInvoiceId?: string; // Nuevo prop
}

export default function PaymentModal({ isOpen, onClose, customer, bcvRate, onSuccess, initialInvoiceId }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      type: "FACTURA",
      amountPaid: 0,
      currency: "USD",
      exchangeRate: bcvRate,
      paymentMethod: "",
      reference: "",
      evidenceUrl: "",
      paymentDate: new Date().toISOString().split('T')[0],
      notes: "",
      appliedInvoiceIds: initialInvoiceId ? [initialInvoiceId] : [],
    },
  });

  // Resetear el formulario cuando cambie el cliente o el id inicial
  useEffect(() => {
    if (isOpen && customer) {
      form.reset({
        type: "FACTURA",
        amountPaid: 0,
        currency: "USD",
        exchangeRate: bcvRate,
        paymentMethod: "",
        reference: "",
        evidenceUrl: "",
        paymentDate: new Date().toISOString().split('T')[0],
        notes: "",
        appliedInvoiceIds: initialInvoiceId ? [initialInvoiceId] : [],
      });
    }
  }, [isOpen, customer, initialInvoiceId, bcvRate, form]);

  const watchInvoices = form.watch("appliedInvoiceIds");
  const watchCurrency = form.watch("currency");
  const watchAmountPaid = form.watch("amountPaid");

  // Obtener solo la ltima factura relevante (Vencida o por vencer en 7 das)
  const latestInvoices = useMemo(() => {
    if (!customer?.invoices || customer.invoices.length === 0) return [];
    
    const today = new Date();
    
    return [...customer.invoices]
      .filter((inv: any) => {
        const dueDate = new Date(inv.proximo_vencimiento_producto || inv.due_date);
        return differenceInDays(dueDate, today) <= 7;
      })
      .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())
      .slice(0, 1);
  }, [customer]);

  // Recalcular monto total segn facturas seleccionadas
  useEffect(() => {
    if (!customer) return;
    
    const selectedTotal = latestInvoices
      .filter((inv: any) => watchInvoices.includes(inv.id))
      .reduce((acc: number, inv: any) => acc + Number(inv.total_usd), 0);

    const finalAmount = watchCurrency === "BS" ? Number((selectedTotal * bcvRate).toFixed(2)) : selectedTotal;
    
    form.setValue("amountPaid", finalAmount);
  }, [watchInvoices, watchCurrency, customer, bcvRate, form, latestInvoices]);

  // Derivar tipo del documento automticamente segn la factura seleccionada
  useEffect(() => {
    if (!customer || !watchInvoices.length) return;
    const selectedInv = customer.invoices?.find((inv: any) => watchInvoices.includes(inv.id));
    if (selectedInv) {
      form.setValue("type", selectedInv.type);
    }
  }, [watchInvoices, customer, form]);

  async function onSubmit(values: PaymentFormValues) {
    setLoading(true);
    try {
      const response = await fetch(`/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...values,
            customerId: customer.id
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        form.reset();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      alert("Error de red al registrar el pago");
    } finally {
      setLoading(false);
    }
  }

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] p-0 overflow-hidden border-slate-200 shadow-2xl flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CreditCard className="h-5 w-5" />
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Registrar Cobro</DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 text-xs italic">
            Seleccione los servicios que est pagando {customer.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Contenedor con Scroll garantizado */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Ultimo Servicio / Factura o Recibo Pendiente</FormLabel>
                  <div className="rounded-md border border-slate-100 bg-slate-50/50 p-2">
                    <div className="space-y-1">
                      {latestInvoices.map((inv: any) => (
                        <div key={inv.id} className="space-y-3">
                          <div className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                            <Checkbox 
                              id={inv.id} 
                              checked={watchInvoices.includes(inv.id)}
                              onCheckedChange={(checked) => {
                                const current = form.getValues("appliedInvoiceIds");
                                if (checked) {
                                  form.setValue("appliedInvoiceIds", [...current, inv.id]);
                                } else {
                                  form.setValue("appliedInvoiceIds", current.filter(id => id !== inv.id));
                                }
                              }}
                            />
                            <label htmlFor={inv.id} className="flex-1 flex justify-between items-center cursor-pointer">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700">Factura #{inv.invoice_number || "---"}</span>
                                <span className="text-[9px] text-slate-400 uppercase font-mono">Emisin: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '---'}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-emerald-600 font-mono">${Number(inv.total_usd).toFixed(2)}</span>
                                <div className="text-[9px] text-slate-400 font-mono">Bs. {Number(inv.total_bs).toLocaleString()}</div>
                              </div>
                            </label>
                          </div>

                          {/* Desglose de Items de la factura */}
                          <div className="pl-9 pr-2 space-y-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Items incluidos:</p>
                            {inv.invoice_items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-100/50 p-1.5 rounded border border-slate-100/80">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-700">{item.product?.name || item.custom_name}</span>
                                  <span className="text-slate-400">Cant: {item.quantity}</span>
                                </div>
                                <div className="text-right font-mono font-bold text-slate-600">
                                  ${Number(item.total_usd).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </div>

                <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-cyan-600">Total a Pagar</p>
                    <p className="text-lg font-black text-slate-900">
                      {watchCurrency === "USD" ? "$" : "Bs. "} 
                      {watchAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-white text-cyan-700 border-cyan-200">
                    {watchInvoices.length} Items seleccionados
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Moneda del Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 border-slate-200 font-bold">
                              <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">Dlares ($)</SelectItem>
                            <SelectItem value="BS">Bolvares (Bs)</SelectItem>
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
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Monto Recibido</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                              {watchCurrency === "USD" ? "$" : "Bs"}
                            </span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              className="pl-8 h-11 border-slate-200 font-mono font-bold text-slate-900" 
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
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Mtodo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 border-slate-200">
                              <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ZELLE">Zelle</SelectItem>
                            <SelectItem value="TRANSFERENCIA_BS">Transferencia Bs</SelectItem>
                            <SelectItem value="PAGO_MOVIL">Pago Mvil</SelectItem>
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
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Referencia / Confirmacin</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input className="pl-9 h-11 border-slate-200" placeholder="0000" {...field} />
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
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Fecha del Pago</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-11 border-slate-200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exchangeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Tasa Aplicada (BCV)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.0001" 
                            className="h-11 border-slate-200 font-mono text-xs" 
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
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Link del Comprobante (URL)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <Input className="pl-9 h-11 border-slate-200" placeholder="https://..." {...field} />
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
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400">Notas / Observaciones</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ej: Pago realizado desde Banco Mercantil..." 
                          className="resize-none border-slate-200 text-[11px] h-20" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="p-6 pt-2 border-t border-slate-100 bg-slate-50/50">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 px-8" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirmar Cobro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
