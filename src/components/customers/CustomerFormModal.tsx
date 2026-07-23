// massivamovilerp/src/components/customers/CustomerFormModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Customer } from "./CustomerPageClient";

import { customerFormSchema, CustomerFormValues } from "@/lib/validations/customer";
import { DocumentType, SaleType, LegalFigure, CompanyType } from "@prisma/client";
import { AlertCircle, Loader2, Plus, Trash2, Package } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: Customer;
}

export function CustomerFormModal({ isOpen, onClose, onSuccess, customer }: CustomerFormModalProps) {
  const [step, setStep] = useState(0);
  const [isConflictStep, setIsConflictStep] = useState(false);
  const [priceLists, setPriceLists] = useState<{ id: string, name: string }[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, { id: string, name: string }[]>>({});
  const [clientUsers, setClientUsers] = useState<{ id: string, email: string, nombre?: string | null, apellido?: string | null }[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<{ success: boolean; messages: string[] } | null>(null);
  const [existingUserIdToAssociate, setExistingUserIdToAssociate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bcvRate, setBcvRate] = useState<number>(1);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema as z.ZodType<CustomerFormValues>),
    mode: 'onChange',
    defaultValues: {
      useExistingUser: false,
      taxIdPrefix: "V" as any,
      type: "EMPRESA",
      rubro: "OTRO",
      tipo_venta: "DETAL",
      figura_legal: "PERSONA_JURIDICA",
      tipo_empresa: "EMPRESA",
      reseteado_sms: false,
      fecha_reseteado: "",
      cantidad_sms_antes_reset: 0,
      recurrencia_compra_SMS: "MENSUAL",
      recurrencia_compra_whatsapp: "MENSUAL",
      taxType: "ORDINARY",
      isTaxExempt: false,
      sameAsContact: false,
      services: [],
      representante_legal_info: {
        cedulaPrefix: "V" as any,
        cedulaNumber: "",
        telefonoPrefix: "+58",
        telefonoNumber: "",
      } as any,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "services",
  });

  const sameAsContact = form.watch("sameAsContact");
  const useExistingUser = form.watch("useExistingUser");
  const address = form.watch("address");
  const fiscalAddress = form.watch("fiscalAddress");
  const taxType = form.watch("taxType");
  const isTaxExempt = form.watch("isTaxExempt");

  const [isFiscalAddressAuto, setIsFiscalAddressAuto] = useState(true);

  // DEBUG: Monitor validation errors
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log("⚠️ Errores de validación detectados:", form.formState.errors);
    }
  }, [form.formState.errors]);

  useEffect(() => {
    if (taxType === "ORDINARY" || isTaxExempt) {
      form.setValue("is_agente_retencion" as any, false);
    }
  }, [taxType, isTaxExempt, form]);

  useEffect(() => {
    if (isFiscalAddressAuto && address !== fiscalAddress) {
      form.setValue("fiscalAddress", address || "");
    }
  }, [address, isFiscalAddressAuto, form, fiscalAddress]);

  useEffect(() => {
    if (customer) {
      setIsFiscalAddressAuto(customer.direccion_fiscal === (customer as any).address);
    }
  }, [customer]);

  useEffect(() => {
    if (sameAsContact) {
      const contactInfo = form.getValues("persona_contacto_info");
      form.setValue("persona_cobranza_info", contactInfo);
    }
  }, [sameAsContact, form]);

  const fetchProductsForList = async (priceListId: string) => {
    if (productsMap[priceListId]) return;
    try {
      const res = await fetch(`/api/productprices?price_list_id=${priceListId}`);
      if (res.ok) {
        const data = await res.json();
        const associatedProducts = data.map((pp: any) => pp.product).filter(Boolean);
        setProductsMap(prev => ({ ...prev, [priceListId]: associatedProducts }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const fetchInitial = async () => {
        try {
          const [plRes, usersRes, bcvRes] = await Promise.all([
            fetch('/api/pricelists'),
            fetch('/api/users/client-users'),
            fetch('/api/parametros')
          ]);
          if (plRes.ok) {
            const plData = await plRes.json();
            setPriceLists(plData);
          }
          if (usersRes.ok) setClientUsers(await usersRes.json());
          if (bcvRes.ok) {
            const bcvData = await bcvRes.json();
            setBcvRate(Number(bcvData) || 1);
          }
        } catch (e) { console.error(e); }
      };
      fetchInitial();
      
      if (customer) {
        const doc_parts = (customer as any).doc_number?.split('-') ?? [];
        const servicios = (customer as any).servicios_contratados || [];
        
        servicios.forEach((s: any) => {
          if (s[0] && !s[2]) {
            fetchProductsForList(s[0]);
          }
        });

        form.reset({
          ...customer,
          businessName: (customer as any).name,
          taxIdPrefix: (customer as any).tipo_doc_identidad,
          taxIdNumber: doc_parts[1] || (customer as any).doc_number,
          phoneNumber: (customer as any).telefono_empresa?.replace('+58', '') || "",
          telefono_celular: (customer as any).telefono_celular?.replace('+58', '') || "",
          address: (customer as any).direccion_fiscal, 
          fiscalAddress: (customer as any).direccion_fiscal,
          taxType: (customer as any).settings?.taxType || "ORDINARY",
          isTaxExempt: (customer as any).settings?.isTaxExempt || false,
          rubro: (customer as any).rubro || "OTRO",
          reseteado_sms: (customer as any).reseteado_sms || false,
          fecha_reseteado: (customer as any).fecha_reseteado ? new Date((customer as any).fecha_reseteado).toISOString().split('T')[0] : "",
          cantidad_sms_antes_reset: (customer as any).cantidad_sms_antes_reset || 0,
          recurrencia_compra_SMS: (customer as any).recurrencia_compra_SMS || "MENSUAL",
          recurrencia_compra_whatsapp: (customer as any).recurrencia_compra_whatsapp || "MENSUAL",
          services: servicios.map((s: any) => ({
            priceListId: s[0],
            productId: s[2] ? null : s[1],
            isManualMode: s[2] || false,
            custom_product: s[2] ? s[1] : (s[3] || ""),
            price_usd: s[4] || undefined
          })),
        } as any);
        setStep(0);
      } else {
        form.reset({
          useExistingUser: false,
          taxIdPrefix: "V" as any,
          type: "EMPRESA",
          rubro: "OTRO",
          tipo_venta: "DETAL",
          figura_legal: "PERSONA_JURIDICA",
          tipo_empresa: "EMPRESA",
          reseteado_sms: false,
          fecha_reseteado: "",
          cantidad_sms_antes_reset: 0,
          recurrencia_compra_SMS: "MENSUAL",
          recurrencia_compra_whatsapp: "MENSUAL",
          taxType: "ORDINARY",
          isTaxExempt: false,
          sameAsContact: false,
          services: [],
          representante_legal_info: {
            cedulaPrefix: "V" as any,
            cedulaNumber: "",
            telefonoPrefix: "+58",
            telefonoNumber: "",
          } as any,
        });
        setStep(0);
      }
    }
  }, [isOpen, customer, form]);

  const isEditing = !!customer;

  const allStepTitles = [
    'Usuario',
    'Datos Empresa',
    'Detalles Empresa',
    'Datos Persona Contacto',
    'Datos Persona Cobranza',
    'Documento Constitutivo',
    'Impuestos',
    'Rep. Legal',
    'Suscripción',
    'Datos de Reseteo'
  ];

  const stepTitles = isEditing 
    ? allStepTitles.filter(t => t !== 'Usuario')
    : allStepTitles.filter(t => t !== 'Datos de Reseteo');

  const totalSteps = stepTitles.length - 1;

  const getFieldsForStep = (step: number): string[] => {
    const currentTitle = stepTitles[step];

    switch (currentTitle) {
      case 'Usuario': return useExistingUser ? ["useExistingUser", "userId"] : ["useExistingUser"];
      case 'Datos Empresa': return ["businessName", "email", "taxIdPrefix", "taxIdNumber", "phoneNumber", "address"];
      case 'Detalles Empresa': return ["ciudad", "estado", "pais", "codigo_postal", "tipo_venta", "figura_legal", "tipo_empresa", "type", "rubro"];
      case 'Datos Persona Contacto': return ["persona_contacto_info.nombre", "persona_contacto_info.email", "persona_contacto_info.telefono", "persona_contacto_info.cargo"];
      case 'Datos Persona Cobranza': return !sameAsContact ? ["persona_cobranza_info.nombre", "persona_cobranza_info.email", "persona_cobranza_info.telefono", "persona_cobranza_info.cargo"] : [];
      case 'Documento Constitutivo': return ["documento_constitutivo_info.nombre_registro", "documento_constitutivo_info.fecha_registro", "documento_constitutivo_info.nro_tomo"];
      case 'Impuestos': return ["taxType", "fiscalAddress", "is_agente_retencion", "porcent_retencion_iva", "porcent_retencion_islr", "porcent_retencion_municipio"];
      case 'Rep. Legal': return ["representante_legal_info.nombre", "representante_legal_info.email", "representante_legal_info.cedulaNumber", "representante_legal_info.telefonoNumber"];
      case 'Suscripción': return ["services"];
      case 'Datos de Reseteo': return ["reseteado_sms", "fecha_reseteado", "cantidad_sms_antes_reset", "recurrencia_compra_SMS", "recurrencia_compra_whatsapp"];
      default: return [];
    }
  };

  const handleNextStep = async () => {
    const fieldsToValidate = getFieldsForStep(step);
    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      setStep((prev) => (prev < totalSteps ? prev + 1 : prev));
      setSubmissionStatus(null);
    } else {
      const errorMessages: string[] = ["Revise los campos obligatorios del paso actual."];
      setSubmissionStatus({ success: false, messages: errorMessages });
    }
  };

  const onSubmit = async (values: CustomerFormValues) => {
    setLoading(true);
    try {
      // Limpieza manual de campos que pueden venir como string vacío "" desde el input type="number"
      const sanitizedValues = {
        ...values,
        porcent_retencion_iva: values.porcent_retencion_iva === ("" as any) ? null : values.porcent_retencion_iva,
        porcent_retencion_islr: values.porcent_retencion_islr === ("" as any) ? null : values.porcent_retencion_islr,
        porcent_retencion_municipio: values.porcent_retencion_municipio === ("" as any) ? null : values.porcent_retencion_municipio,
      };

      const url = customer ? `/api/customers/${customer.id}` : "/api/customers";
      const method = customer ? "PUT" : "POST";
      const body = {
          ...sanitizedValues,
          status: values.status || 'ACTIVE'
      };
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.status === 409 && data.action === 'prompt_to_associate') {
        setExistingUserIdToAssociate(data.existingUserId);
        setIsConflictStep(true);
        setSubmissionStatus({ success: false, messages: [data.message] });
      } else if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setSubmissionStatus({ success: false, messages: [data.message || "Error"] });
      }
    } catch (e) {
      setSubmissionStatus({ success: false, messages: ["Error de servidor"] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[850px] p-0 max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{customer ? "Editar Cliente" : "Crear Nuevo Cliente"}</DialogTitle>
          {!isConflictStep && (
            <DialogDescription>
              {`Paso ${step + 1} de ${totalSteps + 1}: ${stepTitles[step]}`}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={(e) => {
            console.log("[CUSTOMER_FORM] Submit disparado");
            try {
              form.handleSubmit(onSubmit, (errors) => {
                console.log("[CUSTOMER_FORM] Campos faltantes al actualizar:", Object.keys(errors));
              })(e);
            } catch (err) {
              console.error("[CUSTOMER_FORM] Error en handleSubmit:", err);
            }
          }} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {isConflictStep ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <AlertCircle className="h-10 w-10 text-amber-600 mb-4" />
                  <h3 className="text-xl font-bold">Usuario Existente Detectado</h3>
                  <p className="text-slate-500 mb-6">{submissionStatus?.messages[0]}</p>
                  <div className="flex gap-4">
                    <Button type="button" onClick={() => setIsConflictStep(false)} variant="outline">Regresar</Button>
                    <Button type="button" onClick={() => { form.setValue("useExistingUser", true); form.setValue("userId", existingUserIdToAssociate!); form.handleSubmit(onSubmit)(); }} className="bg-cyan-600 text-white">Continuar y Asociar</Button>
                  </div>
                </div>
              ) : (
                <>
                  {stepTitles[step] === 'Usuario' && (
                    <div className="space-y-4">
                      <FormField control={form.control} name="useExistingUser" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-4 bg-slate-50">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel>Usar un Usuario Existente</FormLabel>
                        </FormItem>
                      )} />
                      {useExistingUser && (
                        <FormField control={form.control} name="userId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuario Cliente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Seleccione usuario" /></SelectTrigger></FormControl>
                              <SelectContent>{clientUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>)}</SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      )}
                    </div>
                  )}

                  {stepTitles[step] === 'Datos Empresa' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField name="businessName" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Nombre de la Empresa</FormLabel><FormControl><Input placeholder="MassivaMovil C.A." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField name="email" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="contacto@massivamovil.com" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormItem>
                        <FormLabel>RIF / Cédula</FormLabel>
                        <div className="flex">
                          <FormField name="taxIdPrefix" control={form.control} render={({ field }) => (
                            <FormItem className="w-[80px]"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="J">J</SelectItem><SelectItem value="V">V</SelectItem><SelectItem value="G">G</SelectItem></SelectContent></Select></FormItem>
                          )} />
                          <FormField name="taxIdNumber" control={form.control} render={({ field }) => (
                            <FormItem className="flex-1"><FormControl><Input placeholder="123456789" className="rounded-l-none" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </FormItem>
                      <FormItem>
                        <FormLabel>Teléfono Empresa</FormLabel>
                        <div className="flex">
                          <div className="w-[80px] px-3 py-2 border rounded-l-md bg-slate-100 text-sm flex items-center justify-center font-medium">+58</div>
                          <FormField name="phoneNumber" control={form.control} render={({ field }) => (
                            <FormItem className="flex-1"><FormControl><Input placeholder="2120000000" className="rounded-l-none" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </FormItem>
                      <FormField name="address" control={form.control} render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Dirección Física</FormLabel><FormControl><Textarea placeholder="Av. Principal, Edificio..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  )}

                  {stepTitles[step] === 'Detalles Empresa' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField name="ciudad" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input placeholder="Caracas" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField name="estado" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Estado</FormLabel><FormControl><Input placeholder="Miranda" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField name="pais" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="Venezuela" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField name="codigo_postal" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Código Postal</FormLabel><FormControl><Input placeholder="1060" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      {isEditing && (
                        <FormField name="rubro" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rubro del Cliente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "OTRO"}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Seleccione rubro" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="COBRANZA">Cobranza</SelectItem>
                                <SelectItem value="SALUD_Y_FARMACIA">Salud y Farmacia</SelectItem>
                                <SelectItem value="INDUSTRIAS">Industrias</SelectItem>
                                <SelectItem value="TELECOMUNICACIONES">Telecomunicaciones</SelectItem>
                                <SelectItem value="RETAIL">Retail</SelectItem>
                                <SelectItem value="TECNOLOGIA">Tecnología</SelectItem>
                                <SelectItem value="CONCESIONARIO">Concesionario</SelectItem>
                                <SelectItem value="FINANZAS">Finanzas</SelectItem>
                                <SelectItem value="SERVICIOS">Servicios</SelectItem>
                                <SelectItem value="INSTITUCION">Institución</SelectItem>
                                <SelectItem value="SEGUROS">Seguros</SelectItem>
                                <SelectItem value="EDUCACION">Educación</SelectItem>
                                <SelectItem value="LOTERIAS_OTP">Loterías OTP</SelectItem>
                                <SelectItem value="BAR_Y_RESTAURANTE">Bar y Restaurante</SelectItem>
                                <SelectItem value="SUPERMERCADO">Supermercado</SelectItem>
                                <SelectItem value="AGENCIA_MARKETING">Agencia de Marketing</SelectItem>
                                <SelectItem value="MOVILIDAD">Movilidad</SelectItem>
                                <SelectItem value="IGLESIA">Iglesia</SelectItem>
                                <SelectItem value="CAMPAMENTOS">Campamentos</SelectItem>
                                <SelectItem value="ENTRETENIMIENTO">Entretenimiento</SelectItem>
                                <SelectItem value="CLUBES">Clubes</SelectItem>
                                <SelectItem value="OTRO">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      )}
                      <FormField name="tipo_venta" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Venta</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="MAYOR">Mayor</SelectItem>
                              <SelectItem value="DETAL">Detal</SelectItem>
                              <SelectItem value="MAYOR_Y_DETAL">Mayor y Detal</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField name="figura_legal" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Figura Legal</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Figura..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="PERSONA_JURIDICA">Persona Jurídica</SelectItem>
                              <SelectItem value="GOBIERNO_EMPRENDEDOR_CON_FIRMA_PERSONAL">Gobierno Emprendedor con Firma Personal</SelectItem>
                              <SelectItem value="EMPRENDEDOR_SOLO_CON_RIF">Emprendedor solo con RIF</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField name="tipo_empresa" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Empresa</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona el tipo de empresa" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="EMPRESA">Empresa</SelectItem>
                              <SelectItem value="FABRICANTE">Fabricante</SelectItem>
                              <SelectItem value="PRODUCTOR">Productor</SelectItem>
                              <SelectItem value="DISTRIBUIDORA">Distribuidora</SelectItem>
                              <SelectItem value="MAYORISTA">Mayorista</SelectItem>
                              <SelectItem value="COMERCIO">Comercio</SelectItem>
                              <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                              <SelectItem value="SUPERMERCADO">Supermercado</SelectItem>
                              <SelectItem value="ABASTO">Abasto</SelectItem>
                              <SelectItem value="PANADERIA">Panadería</SelectItem>
                              <SelectItem value="FARMACIA">Farmacia</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField name="email_user_masiva_SMS" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Login Usuario SMS (Opcional)</FormLabel>
                          <FormControl><Input type="email" placeholder="sms_user@example.com" {...field} value={field.value ?? ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField name="email_user_masiva_whatsapp" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Login Usuario WhatsApp (Opcional)</FormLabel>
                          <FormControl><Input type="email" placeholder="whatsapp_user@example.com" {...field} value={field.value ?? ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField name="type" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Cliente</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona el tipo de cliente" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="PERSONA">Persona</SelectItem>
                              <SelectItem value="EMPRESA">Empresa</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                  )}

                  {stepTitles[step] === 'Datos Persona Contacto' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField name="persona_contacto_info.nombre" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Nombre de Contacto</FormLabel><FormControl><Input placeholder="Juan Pérez" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField name="persona_contacto_info.email" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Email de Contacto</FormLabel><FormControl><Input type="email" placeholder="contacto@example.com" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField name="persona_contacto_info.telefono" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono de Contacto</FormLabel>
                          <div className="flex">
                            <div className="w-[80px] px-3 py-2 border rounded-l-md bg-slate-100 text-sm flex items-center justify-center font-medium">+58</div>
                            <FormControl><Input placeholder="2120000000" className="rounded-l-none" {...field} value={field.value ?? ""} /></FormControl>
                          </div>
                        </FormItem>
                      )} />
                      <FormField name="persona_contacto_info.cargo" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="Gerente" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  )}

                  {stepTitles[step] === 'Datos Persona Cobranza' && (
                    <div className="space-y-4">
                      <FormField control={form.control} name="sameAsContact" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-4 bg-slate-50">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel>Los datos de cobranza son los mismos que los de contacto</FormLabel>
                        </FormItem>
                      )} />
                      {!sameAsContact && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField name="persona_cobranza_info.nombre" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Nombre" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                          )} />
                          <FormField name="persona_cobranza_info.email" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="Email" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                          )} />
                          <FormField name="persona_cobranza_info.telefono" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Teléfono</FormLabel><div className="flex"><div className="w-[80px] px-3 py-2 border rounded-l-md bg-slate-100 text-sm flex items-center justify-center font-medium">+58</div><FormControl><Input placeholder="2120000000" className="rounded-l-none" {...field} value={field.value ?? ""} /></FormControl></div></FormItem>
                          )} />
                          <FormField name="persona_cobranza_info.cargo" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="Jefe de Cobranzas" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                          )} />
                        </div>
                      )}
                    </div>
                  )}

                  {stepTitles[step] === 'Documento Constitutivo' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField name="documento_constitutivo_info.nombre_registro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nombre Registro</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField name="documento_constitutivo_info.fecha_registro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField name="documento_constitutivo_info.nro_tomo" control={form.control} render={({ field }) => (<FormItem><FormLabel>Número y Tomo</FormLabel><FormControl><Input placeholder="Nro 1, Tomo 2-A" {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField name="documento_constitutivo_info.email_registro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Email Registro</FormLabel><FormControl><Input type="email" placeholder="registro@example.com" {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                    </div>
                  )}

                  {stepTitles[step] === 'Impuestos' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="taxType" control={form.control} render={({ field }) => (
                          <FormItem><FormLabel>Tipo Contribuyente</FormLabel><Select onValueChange={field.onChange} value={field.value || "ORDINARY"}><FormControl><SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl><SelectContent><SelectItem value="ORDINARY">Ordinario</SelectItem><SelectItem value="SPECIAL">Especial</SelectItem></SelectContent></Select></FormItem>
                        )} />
                        <FormField name="isTaxExempt" control={form.control} render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 rounded-md border p-4 mt-8"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Exento de Impuestos</FormLabel></FormItem>
                        )} />
                      </div>
                      
                      {taxType === "SPECIAL" && (
                        <div className="space-y-4 pt-4 border-t animate-in fade-in">
                          <FormField name="is_agente_retencion" control={form.control} render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 rounded-md border p-4 bg-slate-50">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel>¿Es Agente de Retención?</FormLabel>
                            </FormItem>
                          )} />
                          
                          {form.watch("is_agente_retencion") && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-slate-50/50 shadow-inner">
                              <FormField name="porcent_retencion_iva" control={form.control} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>% Retención IVA</FormLabel>
                                  <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField name="porcent_retencion_islr" control={form.control} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>% Retención ISLR</FormLabel>
                                  <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField name="porcent_retencion_municipio" control={form.control} render={({ field }) => (
                                <FormItem>
                                  <FormLabel>% Retención Municipal</FormLabel>
                                  <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>
                          )}
                        </div>
                      )}

                      <FormField name="fiscalAddress" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Dirección Fiscal</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                    </div>
                  )}

                  {stepTitles[step] === 'Rep. Legal' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField name="representante_legal_info.nombre" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nombre Representante</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormField name="representante_legal_info.email" control={form.control} render={({ field }) => (<FormItem><FormLabel>Email Representante</FormLabel><FormControl><Input type="email" placeholder="representante@example.com" {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                      <FormItem>
                        <FormLabel>Cédula</FormLabel>
                        <div className="flex">
                          <FormField name="representante_legal_info.cedulaPrefix" control={form.control} render={({ field }) => (<FormItem className="w-[80px]"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="V">V</SelectItem><SelectItem value="E">E</SelectItem><SelectItem value="P">P</SelectItem></SelectContent></Select></FormItem>)} />
                          <FormField name="representante_legal_info.cedulaNumber" control={form.control} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="123456789" className="rounded-l-none" {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                        </div>
                      </FormItem>
                    </div>
                  )}

                  {stepTitles[step] === 'Suscripción' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-medium">Servicios / Productos Contratados</h3>
                          <p className="text-xs text-slate-500">Agregue uno o más productos al cliente.</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="text-cyan-600 border-cyan-200"
                          onClick={() => append({ priceListId: null, productId: null, isManualMode: false, custom_product: "" })}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Agregar Servicio
                        </Button>
                      </div>

                      {fields.length === 0 && (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center bg-slate-50">
                          <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No hay servicios agregados. Puede dejarlo en blanco o agregar uno.</p>
                        </div>
                      )}

                      <div className="space-y-4">
                        {fields.map((field, index) => {
                          const service = form.watch(`services.${index}`);
                          return (
                            <div key={field.id} className="p-4 border rounded-lg bg-white shadow-sm relative group animate-in slide-in-from-right-2 duration-200">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white border shadow-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>

                              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                                <Badge variant="secondary" className="bg-cyan-50 text-cyan-700">Servicio #{index + 1}</Badge>
                                <div className="flex items-center space-x-2">
                                  <Label className="text-xs font-medium text-slate-600">¿Producto Manual?</Label>
                                  <Switch 
                                    checked={service?.isManualMode || false} 
                                    onCheckedChange={(checked) => {
                                      form.setValue(`services.${index}.isManualMode`, checked);
                                      form.setValue(`services.${index}.priceListId`, null);
                                      form.setValue(`services.${index}.productId`, null);
                                      form.setValue(`services.${index}.custom_product`, "");
                                    }}
                                  />
                                </div>
                              </div>

                              {!service?.isManualMode ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField 
                                    control={form.control} 
                                    name={`services.${index}.priceListId`} 
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-slate-400">Lista de Precios</FormLabel>
                                        <Select 
                                          onValueChange={(v) => { 
                                            const val = v === "none" ? null : v;
                                            field.onChange(val); 
                                            if (val) fetchProductsForList(val);
                                            form.setValue(`services.${index}.productId`, null);
                                          }} 
                                          value={field.value || "none"}
                                        >
                                          <FormControl><SelectTrigger className="h-9 text-xs border-slate-200"><SelectValue placeholder="Lista..." /></SelectTrigger></FormControl>
                                          <SelectContent>
                                            <SelectItem value="none">Sin lista (Vaciado)</SelectItem>
                                            {priceLists.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )} 
                                  />
                                  <FormField 
                                    control={form.control} 
                                    name={`services.${index}.productId`} 
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-slate-400">Producto Catálogo</FormLabel>
                                        <Select 
                                          onValueChange={(v) => field.onChange(v === "none" ? null : v)} 
                                          value={field.value || "none"} 
                                          disabled={!service?.priceListId}
                                        >
                                          <FormControl><SelectTrigger className="h-9 text-xs border-slate-200"><SelectValue placeholder="Producto..." /></SelectTrigger></FormControl>
                                          <SelectContent>
                                            <SelectItem value="none">Sin producto (Vaciado)</SelectItem>
                                            {(productsMap[service?.priceListId || ""] || []).map(p => (
                                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )} 
                                  />
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <FormField 
                                    control={form.control} 
                                    name={`services.${index}.custom_product`} 
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-slate-400">Nombre del Producto / Servicio Especial</FormLabel>
                                        <FormControl><Input placeholder="Ej: Consultoría Especial Mensual" className="h-9 text-xs border-slate-200" {...field} value={field.value ?? ""} /></FormControl>
                                      </FormItem>
                                    )} 
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField 
                                      control={form.control} 
                                      name={`services.${index}.price_usd`} 
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-[10px] font-bold uppercase text-cyan-600">Precio USD</FormLabel>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                            <FormControl>
                                              <Input 
                                                type="number" 
                                                step="0.01" 
                                                className="h-9 pl-6 text-xs font-mono font-bold border-slate-200" 
                                                placeholder="0.00"
                                                {...field} 
                                                value={field.value || ""} 
                                                onChange={(e) => {
                                                  const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                  field.onChange(val);
                                                }}
                                              />
                                            </FormControl>
                                          </div>
                                        </FormItem>
                                      )} 
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {stepTitles[step] === 'Datos de Reseteo' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField name="reseteado_sms" control={form.control} render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-4 bg-slate-50">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>¿Ha sido reseteado en SMS?</FormLabel>
                              <p className="text-xs text-slate-500">Marcar si el cliente inició un nuevo ciclo.</p>
                            </div>
                          </FormItem>
                        )} />
                        <FormField name="fecha_reseteado" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de Reseteo</FormLabel>
                            <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="cantidad_sms_antes_reset" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad SMS Antes del Reseteo</FormLabel>
                            <FormControl><Input type="number" placeholder="Ej: 5000" {...field} value={field.value ?? 0} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <FormField name="recurrencia_compra_SMS" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recurrencia Compra SMS</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "MENSUAL"}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Seleccione recurrencia" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="MENSUAL">Mensual</SelectItem>
                                <SelectItem value="BIMENSUAL">Bimensual</SelectItem>
                                <SelectItem value="TRES_MESES_A_UN_AÑO">Tres meses a un año</SelectItem>
                                <SelectItem value="MAS_DE_UN_AÑO">Más de un año</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField name="recurrencia_compra_whatsapp" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recurrencia Compra WhatsApp</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "MENSUAL"}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Seleccione recurrencia" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="MENSUAL">Mensual</SelectItem>
                                <SelectItem value="BIMENSUAL">Bimensual</SelectItem>
                                <SelectItem value="TRES_MESES_A_UN_AÑO">Tres meses a un año</SelectItem>
                                <SelectItem value="MAS_DE_UN_AÑO">Más de un año</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="p-6 pt-2 border-t bg-slate-50">
              <div className="flex justify-between items-center w-full">
                <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0 || loading}>
                  Anterior
                </Button>

                {customer && (
                  <div className="flex gap-1.5">
                    {stepTitles.map((_, i) => (
                      <button 
                        key={i}
                        type="button"
                        onClick={() => setStep(i)}
                        className={`w-2 h-2 rounded-full transition-all duration-200 hover:scale-150 ${
                          i === step ? "bg-cyan-600 scale-125 shadow-[0_0_8px_rgba(8,145,178,0.5)]" : "bg-slate-300 hover:bg-cyan-300"
                        }`}
                        title={stepTitles[i]}
                      />
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                  {step < totalSteps ? (
                    <Button type="button" onClick={handleNextStep} className="bg-cyan-600 text-white">Siguiente</Button>
                  ) : (
                    <Button type="submit" disabled={loading} className="bg-cyan-600 text-white min-w-[120px]">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (customer ? "Actualizar" : "Guardar Cliente")}
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
