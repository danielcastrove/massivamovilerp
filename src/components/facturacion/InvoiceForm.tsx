"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
  ChevronLeft,
  Save,
  LayoutGrid
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { getBillingCycleDays } from "@/lib/utils/recurrence";

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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// --- Validation Schema ---
const invoiceItemSchema = z.object({
  priceListId: z.string().optional(),
  productId: z.string().optional(),
  customName: z.string().optional(), // Para productos manuales
  isCustom: z.boolean().default(false),
  quantity: z.number().min(1, "Mínimo 1"),
  unitPriceUsd: z.number().min(0, "Precio requerido"),
  totalUsd: z.number().min(0, "Total requerido"),
}).refine(data => data.isCustom ? !!data.customName : !!data.productId, {
  message: "Debe indicar el producto",
  path: ["productId"]
});

const invoiceFormSchema = z.object({
  customerId: z.string().min(1, "Seleccione un cliente"),
  type: z.enum(["FACTURA", "RECIBO"]),
  currencyMode: z.enum(["USD_BS", "USD_ONLY"]).default("USD_BS"),
  dueDate: z.string().min(1, "Fecha requerida"),
  invoiceNumber: z.number().optional(),
  controlNumber: z.number().optional(),
  applyIgtf: z.boolean().default(false),
  items: z.array(invoiceItemSchema).min(1, "Agregue al menos un item"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const DEFAULT_FORM_VALUES: InvoiceFormValues = {
  customerId: "",
  type: "FACTURA",
  currencyMode: "USD_BS",
  dueDate: new Date().toISOString().split('T')[0],
  invoiceNumber: undefined,
  controlNumber: undefined,
  applyIgtf: false,
  items: [{ priceListId: "", productId: "", isCustom: false, quantity: 1, unitPriceUsd: 0, totalUsd: 0 }],
};

interface InvoiceFormProps {
  initialCustomers: any[];
  initialBcvRate: number;
  initialPriceLists: any[];
  initialInvoiceData?: {
    id: string;
    customerId: string;
    type: string;
    currency_mode?: string;
    due_date?: string;
    invoice_number?: number;
    control_number?: number;
    items: any[];
  };
}

export default function InvoiceForm({ 
  initialCustomers, 
  initialBcvRate, 
  initialPriceLists,
  initialInvoiceData
}: InvoiceFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type') as any;

  const isEditing = !!initialInvoiceData;
  const [selectedCustomer, setSelectedCustomer] = useState<any>(
    isEditing ? initialCustomers.find(c => c.id === initialInvoiceData.customerId) : null
  );
  const [loading, setLoading] = useState(false);
  // Cache de productos por lista de precios para evitar fetchings repetitivos
  const [pricesCache, setPricesCache] = useState<Record<string, any[]>>({});
  // Track si el usuario editó manualmente la fecha de vencimiento
  const [userEditedDueDate, setUserEditedDueDate] = useState(false);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: isEditing ? {
      customerId: initialInvoiceData.customerId,
      type: initialInvoiceData.type as any,
      dueDate: initialInvoiceData.due_date || new Date().toISOString().split('T')[0],
      invoiceNumber: initialInvoiceData.invoice_number,
      controlNumber: initialInvoiceData.control_number,
      applyIgtf: (initialInvoiceData as any).applyIgtf || false,
      items: initialInvoiceData.items.map(item => ({
        priceListId: item.priceListId || "",
        productId: item.productId || "",
        isCustom: item.is_custom || item.isCustom || false,
        customName: item.custom_name || item.customName || "",
        quantity: Number(item.quantity) || 1,
        unitPriceUsd: Number(item.unitPriceUsd || item.unit_price_usd) || 0,
        totalUsd: Number(item.totalUsd || item.total_usd) || 0
      }))
    } : {
      ...DEFAULT_FORM_VALUES,
      type: typeFromUrl === 'RECIBO' ? 'RECIBO' : 'FACTURA'
    },
    mode: "all"
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
    defaultValue: isEditing ? initialInvoiceData.items : DEFAULT_FORM_VALUES.items
  });

  const invoiceType = form.watch("type");

  const watchedApplyIgtf = useWatch({
    control: form.control,
    name: "applyIgtf",
    defaultValue: false
  });

  // --- Cargar precios iniciales si estamos editando ---
  useEffect(() => {
    if (isEditing) {
      const listsToFetch = Array.from(new Set(initialInvoiceData.items.map(item => item.priceListId)));
      listsToFetch.forEach(listId => {
        if (listId) fetchPricesForList(listId);
      });
    }
  }, [isEditing, initialInvoiceData]);

  // --- Auto-calcula dueDate cuando cambian los items (si el usuario no lo editó) ---
  useEffect(() => {
    if (isEditing || userEditedDueDate) return;

    const allPrices = Object.values(pricesCache).flat();
    if (allPrices.length === 0) return;

    const productIds = watchedItems
      .filter((item: any) => item.productId && !item.isCustom)
      .map((item: any) => item.productId);

    if (productIds.length === 0) return;

    const billingDaysList = productIds
      .map((id: string) => {
        const price = allPrices.find((p: any) => p.product_id === id);
        return getBillingCycleDays(price?.product?.billing_cycle);
      })
      .filter((d: number) => d > 0);

    if (billingDaysList.length > 0) {
      const maxDays = Math.max(...billingDaysList);
      const newDueDate = addDays(new Date(), maxDays);
      form.setValue("dueDate", format(newDueDate, "yyyy-MM-dd"), { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedItems, pricesCache, userEditedDueDate, isEditing]);

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
    
    if (isEditing) return;

    // Al cambiar cliente, auto-preparamos las filas según sus servicios contratados
    // servicios_contratados: [[priceListId, productId, isManual, customName], ...]
    const contractedServices = customer?.servicios_contratados as any[][];

    if (contractedServices && Array.isArray(contractedServices) && contractedServices.length > 0) {
      // Deduplicar listas de precios para evitar peticiones redundantes (Vercel Best Practice 4.1)
      const uniqueListIds = Array.from(new Set(
        contractedServices
          .filter(([listId, _, isManual]) => !isManual && listId)
          .map(([listId]) => listId)
      ));

      // Cargar todas las listas necesarias en paralelo antes de procesar los items
      await Promise.all(uniqueListIds.map(listId => fetchPricesForList(listId)));

      const newItems = contractedServices.map(([listId, prodId, isManual, customName]) => {
        const item: any = {
          priceListId: listId || "",
          productId: prodId || "",
          isCustom: !!isManual,
          customName: customName || "",
          quantity: 1,
          unitPriceUsd: 0,
          totalUsd: 0
        };

        if (!isManual && listId && prodId) {
          // Ya están en cache por el Promise.all de arriba
          const prices = pricesCache[listId] || [];
          const pPrice = prices.find((p: any) => p.product_id === prodId);
          if (pPrice) {
            item.unitPriceUsd = Number(pPrice.price_usd);
            item.totalUsd = item.unitPriceUsd;
          } else {
            // Intento de búsqueda en cache global si no se cargó arriba (seguridad)
            fetchPricesForList(listId).then(prices => {
              const p = prices.find((p: any) => p.product_id === prodId);
              if (p) {
                const price = Number(p.price_usd);
                // Esto podría causar un re-render adicional pero asegura consistencia
                // En un refactor mayor usaríamos un store o un hook de fetching
              }
            });
          }
        }
        
        return item;
      });

      form.setValue("items", newItems, { shouldValidate: true, shouldDirty: true });
      setTimeout(() => form.trigger(), 100);
    } else {
      // Si no tiene servicios definidos, usamos el default limpio
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
    
    // IGTF Calculation (3% on total including VAT)
    const igtfAmountUsd = watchedApplyIgtf ? (subtotalUsd + taxAmountUsd) * 0.03 : 0;
    const igtfAmountBs = igtfAmountUsd * initialBcvRate;

    const totalUsd = subtotalUsd + taxAmountUsd + igtfAmountUsd;
    const totalBs = subtotalBs + taxAmountBs + igtfAmountBs;

    let retIvaBs = 0; let retIslrBs = 0; let retMunBs = 0;

    if (selectedCustomer?.is_agente_retencion && invoiceType === "FACTURA") {
      retIvaBs = taxAmountBs * ((selectedCustomer.porcent_retencion_iva || 75) / 100);
      retIslrBs = subtotalBs * ((selectedCustomer.porcent_retencion_islr || 2) / 100);
      retMunBs = subtotalBs * ((selectedCustomer.porcent_retencion_municipio || 0) / 100);
    }

    const totalRetBs = retIvaBs + retIslrBs + retMunBs;
    const netToPayBs = totalBs - totalRetBs;

    return { totalUsd, totalBs, totalRetBs, netToPayBs, subtotalUsd, taxAmountUsd, igtfAmountUsd };
  }, [watchedItems, initialBcvRate, invoiceType, selectedCustomer, watchedApplyIgtf]);

  async function onSubmit(values: InvoiceFormValues) {
    setLoading(true);
    try {
      // Usamos T12:00:00 para evitar que el desfase de zona horaria cambie el día
      const payload = { 
        ...values, 
        due_date: values.dueDate ? `${values.dueDate}T12:00:00` : null,
        currency_mode: values.currencyMode,
        invoice_number: values.invoiceNumber,
        control_number: values.controlNumber,
        currencyRate: initialBcvRate,
        subtotalUsd: totals.subtotalUsd,
        taxAmountUsd: totals.taxAmountUsd,
        igtfAmountUsd: totals.igtfAmountUsd,
        totalUsd: totals.totalUsd,
        totalBs: totals.totalBs,
        totalRetBs: totals.totalRetBs,
        netToPayBs: totals.netToPayBs
      };
      const url = isEditing ? `/api/invoices/${initialInvoiceData.id}` : "/api/invoices";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push("/dashboard/facturacion");
        router.refresh();
      } else {
        const errorData = await response.json();
        alert(`Error al procesar el documento: ${errorData.error || 'Desconocido'}`);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Error de red al procesar el documento");
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
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isEditing ? "Edición de Cobranza" : "Generación de Cobranza"}
            </h1>
            <p className="text-slate-500 mt-1 italic text-sm">Tasa de Cambio BCV: <span className="font-mono font-bold text-cyan-600">Bs. {Number(initialBcvRate).toFixed(4)}</span></p>
          </div>
        </div>
        <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700 px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
          {isEditing ? `Editando Factura #${initialInvoiceData.id.slice(0,8).toUpperCase()}` : "Transacción Fiscal Multimoneda"}
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
                        <Select onValueChange={(v) => { field.onChange(v); handleCustomerChange(v); }} value={field.value} disabled={isEditing}>
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

                  {/* Selector de Moneda (Solo para Recibos) */}
                  {invoiceType === "RECIBO" && (
                    <FormField
                      control={form.control}
                      name="currencyMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-400">Moneda del Recibo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="border-slate-200 h-11"><SelectValue placeholder="Moneda" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="USD_BS">Dólares y Bolívares (Con Tasa)</SelectItem>
                              <SelectItem value="USD_ONLY">Solo Dólares (Sin Tasa)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Campo Fecha de Vencimiento */}
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-400">Vencimiento de la Factura</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            className="border-slate-200 h-11"
                            min={format(new Date(), "yyyy-MM-dd")}
                            {...field}
                            onChange={(e) => {
                              setUserEditedDueDate(true);
                              field.onChange(e);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
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
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ priceListId: selectedCustomer?.price_list_id || "", productId: "", isCustom: false, quantity: 1, unitPriceUsd: 0, totalUsd: 0 })} 
                      className="h-8 text-[10px] font-bold uppercase border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Agregar Producto / Servicio
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="hidden md:grid grid-cols-12 gap-4 mb-2 text-[10px] font-bold uppercase text-slate-400 px-1 tracking-widest">
                    <div className="col-span-3">Origen / Lista</div>
                    <div className="col-span-4">Producto / Descripción</div>
                    <div className="col-span-2">Cant.</div>
                    <div className="col-span-2 text-right">P. Unit USD</div>
                    <div className="col-span-1"></div>
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 md:gap-4 items-start animate-in fade-in duration-300">
                      
                      {/* Origen / Lista */}
                      <div className="col-span-12 md:col-span-3">
                        <div className="flex items-center justify-end space-x-2 h-9 mb-2">
                           <Switch 
                              checked={watchedItems[index]?.isCustom} 
                              onCheckedChange={(checked) => {
                                 form.setValue(`items.${index}.isCustom`, checked);
                                 form.setValue(`items.${index}.unitPriceUsd`, 0);
                                 form.setValue(`items.${index}.totalUsd`, 0);
                              }}
                           />
                           <Label className="text-[10px] font-bold uppercase text-slate-500">Producto Manual</Label>
                        </div>
                        {!watchedItems[index]?.isCustom ? (
                          <FormField
                            control={form.control}
                            name={`items.${index}.priceListId`}
                            render={({ field }) => {
                              const { onChange, value, ...rest } = field;
                              return (
                                <FormItem>
                                  <Select onValueChange={(v) => {
                                    onChange(v);
                                    fetchPricesForList(v);
                                    form.setValue(`items.${index}.productId`, "");
                                    form.setValue(`items.${index}.unitPriceUsd`, 0);
                                    form.setValue(`items.${index}.totalUsd`, 0);
                                  }} value={value}>
                                    <FormControl><SelectTrigger className="border-slate-200 bg-slate-50/30 text-[11px] h-9"><SelectValue placeholder="Lista..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {initialPriceLists.map((lp) => <SelectItem key={lp.id} value={lp.id}>{lp.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              );
                            }}
                          />
                        ) : (
                          <div className="h-9 flex items-center px-3 bg-cyan-50 border border-cyan-100 rounded-lg text-[10px] font-black text-cyan-700 uppercase tracking-tighter">
                            Concepto Manual
                          </div>
                        )}
                      </div>

                      {/* Producto o Descripción Manual (Col 4-7) */}
                      <div className="col-span-12 md:col-span-4 pt-11">
                        {watchedItems[index]?.isCustom ? (
                          <FormField
                            control={form.control}
                            name={`items.${index}.customName`}
                            render={({ field }) => {
                              const { onChange, value, ...rest } = field;
                              return (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      placeholder="Descripción del servicio..." 
                                      className="border-slate-200 h-9 text-[11px]" 
                                      {...rest} 
                                      value={value ?? ""} 
                                      onChange={onChange}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field: pField }) => (
                              <FormItem>
                                <Select onValueChange={(v) => {
                                  pField.onChange(v);
                                  const currentListId = form.getValues(`items.${index}.priceListId`);
                                  const currentPrices = currentListId ? (pricesCache[currentListId] || []) : [];
                                  const p = currentPrices.find(ap => ap.product_id === v);
                                  if (p) {
                                    const price = Number(p.price_usd);
                                    form.setValue(`items.${index}.unitPriceUsd`, price, { shouldValidate: true, shouldDirty: true });
                                    form.setValue(`items.${index}.totalUsd`, price * (form.getValues(`items.${index}.quantity`) || 1), { shouldValidate: true, shouldDirty: true });
                                  }
                                }} value={pField.value} disabled={!watchedItems[index]?.priceListId}>
                                  <FormControl><SelectTrigger className="border-slate-200 text-[11px] h-9"><SelectValue placeholder="Servicio..." /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {((watchedItems[index]?.priceListId ? pricesCache[watchedItems[index]?.priceListId] : undefined) || []).map((p: any) => (
                                      <SelectItem key={p.product_id} value={p.product_id}>{p.product.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {/* Cantidad (Col 8-9) */}
                      <div className="col-span-4 md:col-span-2 pt-11">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field: qField }) => (
                            <FormItem>
                              <Input type="number" {...qField} min={1} className="border-slate-200 h-9 text-center" onChange={(e) => {
                                const v = Number(e.target.value);
                                qField.onChange(v);
                                const up = form.getValues(`items.${index}.unitPriceUsd`) || 0;
                                form.setValue(`items.${index}.totalUsd`, v * up, { shouldValidate: true, shouldDirty: true });
                                setTimeout(() => form.trigger(), 50);
                              }} />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Precio Unitario (Col 10-11) */}
                      <div className="col-span-6 md:col-span-2 pt-11">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPriceUsd`}
                          render={({ field: upField }) => (
                            <div className="space-y-1">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">$</span>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  className="pl-5 font-mono font-bold text-slate-900 border-slate-200 text-right h-9 text-[11px]" 
                                  {...upField}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    upField.onChange(v);
                                    const qty = form.getValues(`items.${index}.quantity`) || 1;
                                    form.setValue(`items.${index}.totalUsd`, v * qty, { shouldValidate: true, shouldDirty: true });
                                    setTimeout(() => form.trigger(), 50);
                                  }}
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold">Bs</span>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  className="pl-6 font-mono text-slate-500 border-dashed border-slate-200 text-right h-7 text-[9px] bg-slate-50/50" 
                                  value={(Number(upField.value) * initialBcvRate).toFixed(2)}
                                  onChange={(e) => {
                                    const vBs = Number(e.target.value);
                                    const vUsd = vBs / initialBcvRate;
                                    upField.onChange(vUsd);
                                    const qty = form.getValues(`items.${index}.quantity`) || 1;
                                    form.setValue(`items.${index}.totalUsd`, vUsd * qty, { shouldValidate: true, shouldDirty: true });
                                    setTimeout(() => form.trigger(), 50);
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        />
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
                <CardContent className="p-6 space-y-4">
                  
                  {/* Desglose detallado de ítems */}
                  <div className="space-y-2 mb-6">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Desglose de Ítems</p>
                    {watchedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span className="truncate max-w-[120px] text-slate-700">
                          {item.isCustom ? item.customName : ((pricesCache[item.priceListId || ""]?.find(p => p.product_id === item.productId)?.product?.name) || "Producto")}
                        </span>
                        <div className="flex gap-3 font-mono">
                          <span className="text-slate-900">${(item.totalUsd || 0).toFixed(2)}</span>
                          <span className="text-slate-400">Bs. {( (item.totalUsd || 0) * initialBcvRate ).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totales en USD / Bs */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-tighter">
                      <span>Subtotal Base</span>
                      <div className="flex gap-3">
                        <span className="text-slate-900">${totals.subtotalUsd.toFixed(2)}</span>
                        <span className="text-slate-500">Bs. {(totals.subtotalUsd * initialBcvRate).toFixed(2)}</span>
                      </div>
                    </div>
                    {invoiceType === "FACTURA" && (
                      <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-tighter">
                        <span>IVA (16%)</span>
                        <div className="flex gap-3">
                          <span className="text-slate-900">${totals.taxAmountUsd.toFixed(2)}</span>
                          <span className="text-slate-500">Bs. {(totals.taxAmountUsd * initialBcvRate).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-1 border-y border-slate-50">
                      <FormField
                        control={form.control}
                        name="applyIgtf"
                        render={({ field }) => (
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-3 w-3 rounded border-slate-300 text-cyan-600" />
                            </FormControl>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">IGTF (3%)</span>
                          </div>
                        )}
                      />
                      <div className="flex gap-3 text-slate-900 text-xs font-medium">
                        <span>${totals.igtfAmountUsd.toFixed(2)}</span>
                        <span>Bs. {(totals.igtfAmountUsd * initialBcvRate).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between font-black text-lg text-slate-900 pt-2 border-t border-slate-100">
                      <span className="tracking-tighter uppercase">Total</span>
                      <div className="flex gap-3">
                        <span className="text-cyan-600">${totals.totalUsd.toFixed(2)}</span>
                        <span className="text-slate-600">Bs. {totals.totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    
                    {totals.totalRetBs > 0 && (
                      <div className="flex justify-between text-xs text-red-600 font-bold border-t pt-2">
                        <span className="uppercase tracking-tighter">Retenciones (-)</span>
                        <span className="font-mono">Bs. {totals.totalRetBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>

                  {/* Botón de Acción */}
                  <Button 
                    type="submit" 
                    className={`w-full h-16 text-white font-black text-sm uppercase tracking-[0.2em] shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl ${isEditing ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-slate-900 hover:bg-slate-800'}`} 
                    disabled={loading || !form.formState.isValid}
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                      <div className="flex items-center gap-3">
                        {isEditing ? "Guardar Cambios" : "Generar Documento"} 
                        {isEditing ? <Save className="h-4 w-4" /> : <ArrowRight className="h-4 w-4 text-cyan-400" />}
                      </div>
                    )}
                  </Button>
                  
                  <div className="pt-2">
                    <p className="text-[9px] text-slate-400 text-center uppercase font-bold leading-relaxed tracking-tighter">
                      Al {isEditing ? "actualizar" : "procesar"} esta factura, se {isEditing ? "mantendrán" : "iniciará"} el ciclo de alertas automáticas vía <span className="text-slate-600">WhatsApp, SMS y Email</span>.
                      <br />
                      Reportar comprobantes a: <span className="text-slate-600 font-black">administracion@massivamovil.com</span>
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
