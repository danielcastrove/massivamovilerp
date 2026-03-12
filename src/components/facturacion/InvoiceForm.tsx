"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Plus, 
  Trash2, 
  Calculator, 
  User, 
  Package, 
  ArrowRight,
  Info,
  Loader2,
  Tags,
  ChevronLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// --- Validation Schema ---
const invoiceItemSchema = z.object({
  priceListId: z.string().min(1, "Seleccione lista"),
  productId: z.string().min(1, "Seleccione un producto"),
  quantity: z.number().min(1, "Mínimo 1"),
  unitPriceUsd: z.number().min(0.01, "Precio requerido"),
  totalUsd: z.number().min(0.01, "Total requerido"),
});

const invoiceFormSchema = z.object({
  customerId: z.string().min(1, "Seleccione un cliente"),
  type: z.enum(["FACTURA", "RECIBO"]),
  items: z.array(invoiceItemSchema).min(1, "Agregue al menos un item"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const DEFAULT_FORM_VALUES: InvoiceFormValues = {
  customerId: "",
  type: "FACTURA",
  items: [{ priceListId: "", productId: "", quantity: 1, unitPriceUsd: 0, totalUsd: 0 }],
};

interface InvoiceFormProps {
  initialCustomers: any[];
  initialBcvRate: number;
  initialPriceLists: any[];
}

export default function InvoiceForm({ initialCustomers, initialBcvRate, initialPriceLists }: InvoiceFormProps) {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // Cache de productos por lista de precios para evitar fetchings repetitivos
  const [pricesCache, setPricesCache] = useState<Record<string, any[]>>({});

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "all"
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const invoiceType = form.watch("type");

  // --- Función para obtener precios de una lista específica ---
  const fetchPricesForList = async (listId: string) => {
    if (pricesCache[listId]) return pricesCache[listId];
    
    try {
      const res = await fetch(`/api/productprices?price_list_id=${listId}`);
      if (res.ok) {
        const data = await res.json();
        setPricesCache(prev => ({ ...prev, [listId]: data }));
        return data;
      }
    } catch (e) {
      console.error("Error fetching prices for list:", listId);
    }
    return [];
  };

  // --- Lógica de Manejo de Cambio de Cliente ---
  const handleCustomerChange = async (customerId: string) => {
    const customer = initialCustomers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    
    // Al cambiar cliente, auto-preparamos la primera fila
    if (customer?.price_list_id) {
      const prices = await fetchPricesForList(customer.price_list_id);
      
      const newItem = {
        priceListId: customer.price_list_id,
        productId: customer.productId || "",
        quantity: 1,
        unitPriceUsd: 0,
        totalUsd: 0
      };

      if (customer.productId) {
        const pPrice = prices.find((p: any) => p.product_id === customer.productId);
        if (pPrice) {
          newItem.unitPriceUsd = Number(pPrice.price_usd);
          newItem.totalUsd = newItem.unitPriceUsd;
        }
      }

      form.setValue("items", [newItem], { shouldValidate: true, shouldDirty: true });
      setTimeout(() => form.trigger(), 100);
    } else {
      form.setValue("items", [DEFAULT_FORM_VALUES.items[0]]);
    }
  };

  // --- Totales ---
  const totals = useMemo(() => {
    const subtotalUsd = watchedItems.reduce((acc, item) => acc + (Number(item.totalUsd) || 0), 0);
    const subtotalBs = subtotalUsd * initialBcvRate;
    const taxRate = invoiceType === "FACTURA" ? 0.16 : 0;
    const taxAmountUsd = subtotalUsd * taxRate;
    const taxAmountBs = subtotalBs * taxRate;
    const totalUsd = subtotalUsd + taxAmountUsd;
    const totalBs = subtotalBs + taxAmountBs;

    let retIvaBs = 0; let retIslrBs = 0; let retMunBs = 0;

    if (selectedCustomer?.is_agente_retencion && invoiceType === "FACTURA") {
      retIvaBs = taxAmountBs * ((selectedCustomer.porcent_retencion_iva || 75) / 100);
      retIslrBs = subtotalBs * ((selectedCustomer.porcent_retencion_islr || 2) / 100);
      retMunBs = subtotalBs * ((selectedCustomer.porcent_retencion_municipio || 0) / 100);
    }

    const totalRetBs = retIvaBs + retIslrBs + retMunBs;
    const netToPayBs = totalBs - totalRetBs;

    return { totalUsd, totalBs, totalRetBs, netToPayBs, subtotalUsd, taxAmountUsd };
  }, [watchedItems, initialBcvRate, invoiceType, selectedCustomer]);

  async function onSubmit(values: InvoiceFormValues) {
    setLoading(true);
    try {
      const payload = { ...values, currencyRate: initialBcvRate, ...totals };
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push("/dashboard/facturacion");
        router.refresh();
      } else {
        alert("Error al procesar el documento");
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/facturacion" 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
            title="Volver a facturación"
          >
            <ChevronLeft className="h-8 w-8" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Generación de Cobranza</h1>
            <p className="text-slate-500 mt-1 italic text-sm">Tasa de Cambio BCV: <span className="font-mono font-bold text-cyan-600">Bs. {Number(initialBcvRate).toFixed(4)}</span></p>
          </div>
        </div>
        <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700 px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
          Transacción Fiscal Multimoneda
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Información del Cliente */}
              <Card className="shadow-sm border-slate-200">
                <div className="bg-slate-50/50 px-6 py-4 border-b flex items-center gap-2">
                  <User className="h-4 w-4 text-cyan-600" />
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-widest">Receptor del Documento</span>
                </div>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-400">Cliente Autorizado</FormLabel>
                        <Select onValueChange={(v) => { field.onChange(v); handleCustomerChange(v); }} value={field.value}>
                          <FormControl><SelectTrigger className="border-slate-200 h-11"><SelectValue placeholder="Busque un cliente..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {initialCustomers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name} ({c.doc_number})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-400">Naturaleza del Documento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="border-slate-200 h-11"><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="FACTURA">Factura Fiscal (Seniat)</SelectItem>
                            <SelectItem value="RECIBO">Recibo de Cobro / Nota de Entrega</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Detalle de Ítems */}
              <Card className="shadow-sm border-slate-200">
                <div className="bg-slate-50/50 px-6 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-cyan-600" />
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-widest">Desglose de Servicios</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ priceListId: selectedCustomer?.price_list_id || "", productId: "", quantity: 1, unitPriceUsd: 0, totalUsd: 0 })} className="h-8 text-[10px] font-bold uppercase border-slate-300 hover:bg-slate-50">
                    <Plus className="h-3 w-3 mr-1" /> Añadir Concepto
                  </Button>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="hidden md:grid grid-cols-12 gap-4 mb-2 text-[10px] font-bold uppercase text-slate-400 px-1 tracking-widest">
                    <div className="col-span-3">Lista Precios</div>
                    <div className="col-span-4">Producto</div>
                    <div className="col-span-2">Cant.</div>
                    <div className="col-span-2 text-right">Total USD</div>
                    <div className="col-span-1"></div>
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 md:gap-4 items-start animate-in fade-in duration-300">
                      
                      {/* Lista de Precios */}
                      <div className="col-span-12 md:col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.priceListId`}
                          render={({ field: lpField }) => (
                            <FormItem>
                              <Select onValueChange={(v) => {
                                lpField.onChange(v);
                                fetchPricesForList(v);
                                form.setValue(`items.${index}.productId`, "");
                                form.setValue(`items.${index}.unitPriceUsd`, 0);
                                form.setValue(`items.${index}.totalUsd`, 0);
                              }} value={lpField.value}>
                                <FormControl><SelectTrigger className="border-slate-200 bg-slate-50/30 text-[11px] h-9"><SelectValue placeholder="Lista..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {initialPriceLists.map((lp) => <SelectItem key={lp.id} value={lp.id}>{lp.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Producto */}
                      <div className="col-span-12 md:col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field: pField }) => (
                            <FormItem>
                              <Select onValueChange={(v) => {
                                pField.onChange(v);
                                const currentPrices = pricesCache[watchedItems[index].priceListId] || [];
                                const p = currentPrices.find(ap => ap.product_id === v);
                                if (p) {
                                  const price = Number(p.price_usd);
                                  form.setValue(`items.${index}.unitPriceUsd`, price, { shouldValidate: true });
                                  form.setValue(`items.${index}.totalUsd`, price * (form.getValues(`items.${index}.quantity`) || 1), { shouldValidate: true });
                                  setTimeout(() => form.trigger(), 50);
                                }
                              }} value={pField.value} disabled={!watchedItems[index].priceListId}>
                                <FormControl><SelectTrigger className="border-slate-200 text-[11px] h-9"><SelectValue placeholder="Servicio..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {(pricesCache[watchedItems[index].priceListId] || []).map((p: any) => (
                                    <SelectItem key={p.product_id} value={p.product_id}>{p.product.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Cantidad */}
                      <div className="col-span-4 md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field: qField }) => (
                            <FormItem>
                              <Input type="number" {...qField} min={1} className="border-slate-200 h-9 text-center" onChange={(e) => {
                                const v = Number(e.target.value);
                                qField.onChange(v);
                                const up = form.getValues(`items.${index}.unitPriceUsd`) || 0;
                                form.setValue(`items.${index}.totalUsd`, v * up, { shouldValidate: true });
                                setTimeout(() => form.trigger(), 50);
                              }} />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Total */}
                      <div className="col-span-6 md:col-span-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">$</span>
                          <Input className="pl-5 bg-slate-50 font-mono font-bold text-slate-900 border-slate-100 text-right h-9 text-[11px]" readOnly value={Number(watchedItems[index]?.totalUsd).toFixed(2)} />
                        </div>
                      </div>

                      <div className="col-span-2 md:col-span-1 flex justify-end pt-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="text-slate-300 hover:text-red-500 h-9 w-9"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Información Fiscal */}
              {selectedCustomer?.is_agente_retencion && invoiceType === "FACTURA" && (
                <Alert className="bg-white border-cyan-200 shadow-sm">
                  <Tags className="h-4 w-4 text-cyan-600" />
                  <AlertTitle className="text-cyan-900 font-bold text-xs uppercase tracking-widest">Perfil de Retenciones Activo</AlertTitle>
                  <AlertDescription className="text-slate-600 text-[10px] font-medium mt-1">
                    Este cliente operará bajo retenciones automáticas: IVA ({selectedCustomer.porcent_retencion_iva}%) e ISLR ({selectedCustomer.porcent_retencion_islr}%). Los montos se verán reflejados en la liquidación final en Bolívares.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Columna Derecha: Liquidación Final (DISEÑO BLANCO) */}
            <div className="space-y-6">
              <Card className="shadow-2xl sticky top-24 overflow-hidden border-slate-200 bg-white border-t-4 border-t-cyan-500">
                <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-cyan-600" />
                  <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-800">Liquidación Final</span>
                </div>
                <CardContent className="p-6 space-y-6">
                  
                  {/* Totales en USD */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-tighter">
                      <span>Subtotal Base</span>
                      <span className="text-slate-900">${totals.subtotalUsd.toFixed(2)}</span>
                    </div>
                    {invoiceType === "FACTURA" && (
                      <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-tighter">
                        <span>Impuestos (IVA 16%)</span>
                        <span className="text-slate-900">${totals.taxAmountUsd.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator className="bg-slate-100" />
                    <div className="flex justify-between font-black text-xl text-slate-900">
                      <span className="tracking-tighter uppercase">Total USD</span>
                      <span className="text-cyan-600">${totals.totalUsd.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Totales en Bolívares */}
                  <div className="bg-slate-50/80 p-5 rounded-2xl space-y-4 border border-slate-100 shadow-inner">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Equivalente en Bs.</span>
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-cyan-700">BCV</span>
                    </div>
                    
                    <div className="flex justify-between text-sm font-medium text-slate-600">
                      <span>Total Documento</span>
                      <span className="font-mono text-slate-900">Bs. {totals.totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    {totals.totalRetBs > 0 && (
                      <div className="flex justify-between text-xs text-red-600 font-bold">
                        <span className="uppercase tracking-tighter">Retenciones (-)</span>
                        <span className="font-mono leading-none">Bs. {totals.totalRetBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    
                    <Separator className="bg-white" />
                    
                    <div className="flex flex-col gap-1 pt-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-cyan-700">Neto a Liquidar</span>
                      <div className="flex justify-between items-end">
                        <span className="font-black text-4xl text-slate-900 tracking-tighter">
                          {totals.netToPayBs.toLocaleString("es-VE", { maximumFractionDigits: 0 })}
                          <span className="text-lg font-bold">,{ (totals.netToPayBs % 1).toFixed(2).split('.')[1] }</span>
                        </span>
                        <span className="font-black text-slate-400 text-sm mb-1 ml-1">Bs.</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón de Acción */}
                  <Button type="submit" className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl" disabled={loading || !form.formState.isValid}>
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                      <div className="flex items-center gap-3">
                        Emitir Documento <ArrowRight className="h-4 w-4 text-cyan-400" />
                      </div>
                    )}
                  </Button>
                  
                  <div className="pt-2">
                    <p className="text-[9px] text-slate-400 text-center uppercase font-bold leading-relaxed tracking-tighter">
                      Al procesar esta factura, se iniciará el ciclo de alertas automáticas vía <span className="text-slate-600">WhatsApp, SMS y Email</span>.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
