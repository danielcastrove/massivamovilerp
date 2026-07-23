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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Package, User, MapPin, Calendar, Clock, FileText } from "lucide-react";
import { LeadSource, LeadStatus, LeadType } from "@prisma/client";
import { Lead } from "./LeadsPageClient";
import { LeadPdfButtons } from "./LeadPdfButtons";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const leadFormSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  cedula: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  productId: z.string().optional().nullable(),
  priceListId: z.string().optional().nullable(),
  custom_product: z.string().optional().nullable(),
  procedencia: z.nativeEnum(LeadSource),
  comentarios: z.string().optional(),
  fecha_llamada: z.string().optional().nullable(),
  status: z.nativeEnum(LeadStatus).default("SIN_CONTACTAR"),
  tipo_lead: z.nativeEnum(LeadType).default("NORMAL"),
  isManualMode: z.boolean().default(false),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead?: Lead;
  readOnly?: boolean;
}

export function LeadFormModal({ isOpen, onClose, onSuccess, lead, readOnly = false }: LeadFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedPriceList, setSelectedPriceList] = useState<string | null>(null);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      cedula: "",
      email: "",
      telefono: "",
      procedencia: "SITIO_WEB",
      status: "SIN_CONTACTAR",
      tipo_lead: "NORMAL",
      comentarios: "",
      productId: null,
      priceListId: null,
      custom_product: "",
      fecha_llamada: "",
      isManualMode: false,
    },
  });

  const isManualMode = form.watch("isManualMode");

  useEffect(() => {
    if (lead) {
      form.reset({
        ...lead,
        fecha_llamada: lead.fecha_llamada ? new Date(lead.fecha_llamada).toISOString().split('T')[0] : "",
        isManualMode: !!lead.custom_product && !lead.productId,
      } as any);
      if (lead.priceListId) setSelectedPriceList(lead.priceListId);
    } else {
      form.reset({
        nombre: "",
        apellido: "",
        cedula: "",
        email: "",
        telefono: "",
        procedencia: "SITIO_WEB",
        status: "SIN_CONTACTAR",
        tipo_lead: "NORMAL",
        comentarios: "",
        productId: null,
        priceListId: null,
        custom_product: "",
        fecha_llamada: "",
        isManualMode: false,
      });
      setSelectedPriceList(null);
    }
  }, [lead, form, isOpen]);

  // Handle mode toggle
  const handleModeChange = (checked: boolean) => {
    form.setValue("isManualMode", checked);
    // Reset all product-related fields when mode changes
    form.setValue("priceListId", null);
    form.setValue("productId", null);
    form.setValue("custom_product", "");
    setSelectedPriceList(null);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const plRes = await fetch("/api/pricelists");
        if (plRes.ok) setPriceLists(await plRes.json());
      } catch (e) {
        console.error("Error fetching price lists", e);
      }
    };
    if (isOpen) fetchInitialData();
  }, [isOpen]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedPriceList) {
        setProducts([]);
        return;
      }
      try {
        const res = await fetch(`/api/productprices?price_list_id=${selectedPriceList}`);
        if (res.ok) setProducts(await res.json());
      } catch (e) {
        console.error("Error fetching products", e);
      }
    };
    fetchProducts();
  }, [selectedPriceList]);

  async function onSubmit(values: LeadFormValues) {
    if (readOnly) return;
    setLoading(true);
    
    // Preparar datos: Si es manual, nos aseguramos de que no se envíe lista ni producto de catálogo
    const submissionData = { ...values };
    if (values.isManualMode) {
      submissionData.priceListId = null;
      submissionData.productId = null;
    } else {
      submissionData.custom_product = null;
    }

    try {
      const url = lead ? `/api/leads/${lead.id}` : "/api/leads";
      const method = lead ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Error submitting lead:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            {readOnly ? <FileText className="h-6 w-6 text-blue-600" /> : <User className="h-6 w-6 text-cyan-600" />}
            {readOnly ? "Detalles del Prospecto" : lead ? "Editar Lead" : "Nuevo Prospecto (Lead)"}
          </DialogTitle>
          {readOnly && lead && (
            <div className="mr-8">
              <LeadPdfButtons lead={lead} />
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            
            {/* Sección 1: Datos Personales */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-500 bg-slate-100 p-2 rounded tracking-widest flex items-center gap-2">
                <User className="h-4 w-4" /> Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                  <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ej: Juan" {...field} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="apellido" render={({ field }) => (
                  <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input placeholder="Ej: Pérez" {...field} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="juan@correo.com" {...field} value={field.value || ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telefono" render={({ field }) => (
                  <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="+58 412..." {...field} value={field.value || ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cedula" render={({ field }) => (
                  <FormItem><FormLabel>Cédula/RIF</FormLabel><FormControl><Input placeholder="V-12345678" {...field} value={field.value || ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tipo_lead" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Lead</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="VIP">💎 VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Sección 2: Producto e Interés */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-100 p-2 rounded">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Package className="h-4 w-4" /> Interés y Producto
                </h3>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="manual-mode" className="text-xs font-medium text-slate-600">¿Producto Manual?</Label>
                  <Switch 
                    id="manual-mode" 
                    checked={isManualMode} 
                    onCheckedChange={handleModeChange}
                    disabled={readOnly}
                  />
                </div>
              </div>

              {!isManualMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <FormField control={form.control} name="priceListId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lista de Precios</FormLabel>
                      <Select 
                        onValueChange={(v) => { 
                          const val = v === "none" ? null : v;
                          field.onChange(val); 
                          setSelectedPriceList(val);
                          form.setValue("productId", null);
                        }} 
                        value={field.value || "none"} 
                        disabled={readOnly}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione lista..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin lista (Vaciado)</SelectItem>
                          {priceLists.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="productId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producto Catálogo</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(v === "none" ? null : v)} 
                        value={field.value || "none"} 
                        disabled={!selectedPriceList || readOnly}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione producto..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin producto (Vaciado)</SelectItem>
                          {products.map((p: any) => <SelectItem key={p.product_id} value={p.product_id}>{p.product.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-300">
                  <FormField control={form.control} name="custom_product" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Producto / Servicio Manual</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Desarrollo Web Personalizado" {...field} value={field.value || ""} disabled={readOnly} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
            </div>

            {/* Sección 3: Gestión Comercial */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-500 bg-slate-100 p-2 rounded tracking-widest flex items-center gap-2">
                <Clock className="h-4 w-4" /> Gestión Comercial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="procedencia" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procedencia</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="SITIO_WEB">Sitio Web</SelectItem>
                        <SelectItem value="LLAMADA">Llamada</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                        <SelectItem value="RECOMENDACION">Recomendación</SelectItem>
                        <SelectItem value="OTRO">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="SIN_CONTACTAR">Sin Contactar</SelectItem>
                        <SelectItem value="PROPUESTA_ENVIADA">Propuesta Enviada</SelectItem>
                        <SelectItem value="LLAMADA_REALIZADA">Llamada Realizada</SelectItem>
                        <SelectItem value="CONTACTO_REALIZADO">Contacto Realizado</SelectItem>
                        <SelectItem value="CLIENTE_CERRADO">Cliente Cerrado</SelectItem>
                        <SelectItem value="ESPERANDO_APROBACION">Esperando Aprobación</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="fecha_llamada" render={({ field }) => (
                  <FormItem><FormLabel>Fecha Llamada Vendedor</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} disabled={readOnly} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="comentarios" render={({ field }) => (
                <FormItem><FormLabel>Comentarios / Notas</FormLabel><FormControl><Textarea placeholder="Notas sobre el prospecto..." {...field} value={field.value || ""} disabled={readOnly} /></FormControl></FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                {readOnly ? "Cerrar" : "Cancelar"}
              </Button>
              {!readOnly && (
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[120px]" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {lead ? "Actualizar" : "Guardar Prospecto"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
