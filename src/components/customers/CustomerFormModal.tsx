// massivamovilerp/src/components/customers/CustomerFormModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
}





import { customerFormSchema, CustomerFormValues } from "@/lib/validations/customer";
import { DocumentType, SaleType, LegalFigure, CompanyType } from "@prisma/client";

export function CustomerFormModal({ isOpen, onClose, customer }: CustomerFormModalProps) {
  const [step, setStep] = useState(0); // Start at step 0
  const [priceLists, setPriceLists] = useState<{ id: string, name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string, name: string }[]>([]);
  const [clientUsers, setClientUsers] = useState<{ id: string, email: string }[]>([]); // New state for client users
  const [submissionStatus, setSubmissionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    mode: 'onChange',
    defaultValues: {
      useExistingUser: false,
      userId: undefined,
      businessName: "",
      email: "",
      taxIdPrefix: DocumentType.J,
      taxIdNumber: "",
      phonePrefix: "+58",
      phoneNumber: "",
      telefono_celularPrefix: "+58",
      telefono_celular: "",
      sitio_web: "",
      address: "",
      ciudad: "",
      estado: "",
      pais: "",
      codigo_postal: "",
      tipo_venta: undefined,
      figura_legal: undefined,
      tipo_empresa: undefined,
      email_user_masiva_SMS: "",
      email_user_masiva_whatsapp: "",
      persona_contacto_info: {
        nombre: "",
        email: "",
        telefonoPrefix: "+58",
        telefono: "",
        telefono_celularPrefix: "+58",
        telefono_celular: "",
        cargo: "",
      },
      sameAsContact: false,
      persona_cobranza_info: {
        nombre: "",
        email: "",
        telefonoPrefix: "+58",
        telefono: "",
        telefono_celularPrefix: "+58",
        telefono_celular: "",
        cargo: "",
      },
      documento_constitutivo_info: {
        nombre_registro: "",
        fecha_registro: "",
        nro_tomo: "",
        email_registro: "",
      },
      taxType: "ORDINARY",
      isTaxExempt: false,
      is_agente_retencion: false,
      porcent_retencion_iva: 0,
      porcent_retencion_islr: 0,
      porcent_retencion_municipio: 0,
      fiscalAddress: "",
      representante_legal_info: {
        nombre: "",
        email: "",
        cedulaPrefix: DocumentType.V,
        cedulaNumber: "",
        telefonoPrefix: "+58",
        telefonoNumber: "",
        cargo: "",
      },
      priceListId: "",
      productId: "",
    },
  });

  // Watch all form values to check for completeness
  const formValues = form.watch();


  
  const isAgent = form.watch("is_agente_retencion");
  const selectedPriceList = form.watch("priceListId");
  const sameAsContact = form.watch("sameAsContact");
  const useExistingUser = form.watch("useExistingUser");

  useEffect(() => {
    if (sameAsContact) {
      const contactInfo = form.getValues("persona_contacto_info");
      form.setValue("persona_cobranza_info", contactInfo);
    } else {
      // Clear the fields if the checkbox is unchecked
      form.setValue("persona_cobranza_info", {
        nombre: "",
        email: "",
        telefono: "",
        telefono_celular: "",
        cargo: "",
      });
    }
  }, [sameAsContact, form]);

  useEffect(() => {
    form.setValue('productId', '');
    if (selectedPriceList) {
      const fetchProductsForPriceList = async () => {
        try {
          const res = await fetch(`/api/productprices?price_list_id=${selectedPriceList}`);
          if (!res.ok) throw new Error('Failed to fetch products for the selected price list');
          const productPrices = await res.json();
          const associatedProducts = productPrices.map((pp: any) => pp.product).filter(Boolean);
          setProducts(associatedProducts);
        } catch (error) {
          console.error(error);
          setProducts([]);
        }
      };
      fetchProductsForPriceList();
    } else {
      setProducts([]);
    }
  }, [selectedPriceList, form]);

  useEffect(() => {
    if (isOpen) {
      setSubmissionStatus(null);
      const fetchInitialData = async () => {
        try {
          const priceListsRes = await fetch('/api/pricelists');
          if (!priceListsRes.ok) throw new Error('Failed to fetch price lists');
          const priceListsData = await priceListsRes.json();
          if (Array.isArray(priceListsData)) setPriceLists(priceListsData);

          const clientUsersRes = await fetch('/api/users/client-users');
          if (!clientUsersRes.ok) throw new Error('Failed to fetch client users');
          const clientUsersData = await clientUsersRes.json();
          if (Array.isArray(clientUsersData)) setClientUsers(clientUsersData);

        } catch (error) {
          console.error("Failed to fetch data for form:", error);
          setSubmissionStatus({ success: false, message: "No se pudieron cargar los datos iniciales." });
        }
      };
      fetchInitialData();
      
      if (customer) {
        const contactInfo = customer.persona_contacto_info as any;
        const cobranzaInfo = customer.persona_cobranza_info as any;
        const documentoInfo = customer.documento_constitutivo_info as any;
        const legalRepInfo = customer.representante_legal_info as any;

        form.reset({
          useExistingUser: !!customer.user_id,
          userId: customer.user_id || undefined,
          businessName: customer.name || "",
          email: customer.email || "",
          taxIdPrefix: (customer.doc_number?.split('-')[0] as DocumentType) || DocumentType.J,
          taxIdNumber: customer.doc_number?.split('-')[1] || "",
          phonePrefix: customer.telefono_empresa?.startsWith('+58') ? '+58' : '+58', // Assuming +58 for Venezuela
          phoneNumber: customer.telefono_empresa?.startsWith('+58') ? customer.telefono_empresa.substring(3) : customer.telefono_empresa || "",
          telefono_celularPrefix: customer.telefono_celular?.startsWith('+58') ? '+58' : '+58',
          telefono_celular: customer.telefono_celular?.startsWith('+58') ? customer.telefono_celular.substring(3) : customer.telefono_celular || "",
          sitio_web: customer.sitio_web || "",
          address: customer.direccion_fiscal || "",
          ciudad: customer.ciudad || "",
          estado: customer.estado || "",
          pais: customer.pais || "",
          codigo_postal: customer.codigo_postal || "",
          tipo_venta: customer.tipo_venta || undefined,
          figura_legal: customer.figura_legal || undefined,
          tipo_empresa: customer.tipo_empresa || undefined,
          email_user_masiva_SMS: customer.email_user_masiva_SMS || "",
          email_user_masiva_whatsapp: customer.email_user_masiva_whatsapp || "",
          persona_contacto_info: {
            nombre: contactInfo?.nombre || "",
            email: contactInfo?.email || "",
            telefonoPrefix: contactInfo?.telefono?.startsWith('+58') ? '+58' : '+58',
            telefono: contactInfo?.telefono?.startsWith('+58') ? contactInfo?.telefono.substring(3) : contactInfo?.telefono || "",
            telefono_celularPrefix: contactInfo?.telefono_celular?.startsWith('+58') ? '+58' : '+58',
            telefono_celular: contactInfo?.telefono_celular?.startsWith('+58') ? contactInfo?.telefono_celular.substring(3) : contactInfo?.telefono_celular || "",
            cargo: contactInfo?.cargo || "",
          },
          sameAsContact: false, // This will be handled by a separate logic if needed
          persona_cobranza_info: {
            nombre: cobranzaInfo?.nombre || "",
            email: cobranzaInfo?.email || "",
            telefonoPrefix: cobranzaInfo?.telefono?.startsWith('+58') ? '+58' : '+58',
            telefono: cobranzaInfo?.telefono?.startsWith('+58') ? cobranzaInfo?.telefono.substring(3) : cobranzaInfo?.telefono || "",
            telefono_celularPrefix: cobranzaInfo?.telefono_celular?.startsWith('+58') ? '+58' : '+58',
            telefono_celular: cobranzaInfo?.telefono_celular?.startsWith('+58') ? cobranzaInfo?.telefono_celular.substring(3) : cobranzaInfo?.telefono_celular || "",
            cargo: cobranzaInfo?.cargo || "",
          },
          documento_constitutivo_info: {
            nombre_registro: documentoInfo?.nombre_registro || "",
            fecha_registro: documentoInfo?.fecha_registro ? new Date(documentoInfo.fecha_registro).toISOString().split('T')[0] : "",
            nro_tomo: documentoInfo?.nro_tomo || "",
            email_registro: documentoInfo?.email_registro || "",
          },
          taxType: (customer.settings as any)?.taxType || "ORDINARY", // Assuming taxType might be in settings or a direct field
          isTaxExempt: (customer.settings as any)?.isTaxExempt || false,
          is_agente_retencion: customer.is_agente_retencion || false,
          porcent_retencion_iva: customer.porcent_retencion_iva?.toNumber() || 75,
          porcent_retencion_islr: customer.porcent_retencion_islr?.toNumber() || 2,
          porcent_retencion_municipio: customer.porcent_retencion_municipio?.toNumber() || 0,
          fiscalAddress: customer.direccion_fiscal || "",
          representante_legal_info: {
            nombre: legalRepInfo?.nombre || "",
            email: legalRepInfo?.email || "",
            cedulaPrefix: (legalRepInfo?.cedula?.split('-')[0] as DocumentType) || DocumentType.V,
            cedulaNumber: legalRepInfo?.cedula?.split('-')[1] || "",
            telefonoPrefix: legalRepInfo?.telefono_celular?.startsWith('+58') ? '+58' : '+58', // Corrected to use telefonoPrefix
            telefonoNumber: legalRepInfo?.telefono_celular?.startsWith('+58') ? legalRepInfo?.telefono_celular.substring(3) : legalRepInfo?.telefono_celular || "",
            cargo: legalRepInfo?.cargo || "",
          },
          priceListId: customer.price_list_id || "",
          productId: customer.productId || "",
        });
      } else {
        form.reset();
      }
      setStep(0); // Start at step 0 for new customer
    }
  }, [customer, isOpen, form, clientUsers]); // Added clientUsers to dependencies

  const handleNextStep = async () => {
    let isValid = true; // Assume valid by default
    const currentValues = form.getValues(); // Get all current form values

    switch (step) {
      case 0:
        if (currentValues.useExistingUser) {
          // If using existing user, userId must be provided
          isValid = await form.trigger('userId');
        }
        // If not using an existing user, no validation is needed for this step to proceed
        break;
      case 1:
        isValid = await form.trigger(['businessName', 'taxIdNumber', 'email', 'phoneNumber', 'address']);
        break;
      case 2:
        isValid = await form.trigger(['ciudad', 'estado', 'pais', 'codigo_postal', 'tipo_venta', 'figura_legal', 'tipo_empresa']);
        break;
      case 3:
        isValid = await form.trigger(['persona_contacto_info.nombre', 'persona_contacto_info.email', 'persona_contacto_info.telefono', 'persona_contacto_info.cargo']);
        break;
      case 4:
        if (!currentValues.sameAsContact) {
            isValid = await form.trigger(['persona_cobranza_info.nombre', 'persona_cobranza_info.email', 'persona_cobranza_info.telefono', 'persona_cobranza_info.cargo']);
        }
        break;
      case 5:
        // Optional step, no validation needed to proceed
        isValid = true;
        break;
      case 6:
        const fieldsToValidateStep6: (keyof CustomerFormValues)[] = ['taxType'];
        if (!currentValues.isTaxExempt) {
            fieldsToValidateStep6.push('fiscalAddress');
        }
        if (currentValues.is_agente_retencion) {
            fieldsToValidateStep6.push('porcent_retencion_iva', 'porcent_retencion_islr');
        }
        isValid = await form.trigger(fieldsToValidateStep6 as any);
        break;
      case 7:
        isValid = await form.trigger(['representante_legal_info.nombre', 'representante_legal_info.email', 'representante_legal_info.cedulaNumber', 'representante_legal_info.telefonoNumber']);
        break;
      case 8:
         isValid = await form.trigger(['priceListId', 'productId']);
        break;
    }

    if (isValid) {
      setStep((prev) => prev + 1);
    } else {
        console.log("Validation failed for step", step, form.formState.errors); // Debugging line
    }
  };

  const handlePreviousStep = () => {
    setStep((prev) => prev - 1);
  };

  async function onSubmit(values: CustomerFormValues) {
    setSubmissionStatus(null);

    const formatPhoneNumberWithPrefix = (prefix: string | undefined | null, number: string | undefined | null) => {
      if (!number) return null;
      const cleanNumber = number.replace(/^0+/, ''); // Remove leading zeros
      return `${prefix || '+58'}${cleanNumber}`;
    };

    const combinedValues = {
      ...values,
      doc_number: `${values.taxIdPrefix}-${values.taxIdNumber}`,
      telefono_empresa: formatPhoneNumberWithPrefix(values.phonePrefix, values.phoneNumber),
      telefono_celular: formatPhoneNumberWithPrefix(values.telefono_celularPrefix, values.telefono_celular),
      // Ensure optional fields are explicitly set to null if empty string or undefined
      sitio_web: values.sitio_web || null,
      address: values.address || null,
      email_user_masiva_SMS: values.email_user_masiva_SMS || null,
      email_user_masiva_whatsapp: values.email_user_masiva_whatsapp || null,
      ciudad: values.ciudad || null,
      estado: values.estado || null,
      pais: values.pais || null,
      codigo_postal: values.codigo_postal || null,
      tipo_venta: values.tipo_venta || null,
      figura_legal: values.figura_legal || null,
      tipo_empresa: values.tipo_empresa || null,
      persona_contacto_info: values.persona_contacto_info ? {
        ...values.persona_contacto_info,
        telefono: formatPhoneNumberWithPrefix(values.persona_contacto_info.telefonoPrefix, values.persona_contacto_info.telefono),
        telefono_celular: formatPhoneNumberWithPrefix(values.persona_contacto_info.telefono_celularPrefix, values.persona_contacto_info.telefono_celular),
        cargo: values.persona_contacto_info.cargo || null,
      } : null,
      persona_cobranza_info: values.persona_cobranza_info ? {
        ...values.persona_cobranza_info,
        nombre: values.persona_cobranza_info.nombre || null,
        email: values.persona_cobranza_info.email || null,
        telefono: formatPhoneNumberWithPrefix(values.persona_cobranza_info.telefonoPrefix, values.persona_cobranza_info.telefono),
        telefono_celular: formatPhoneNumberWithPrefix(values.persona_cobranza_info.telefono_celularPrefix, values.persona_cobranza_info.telefono_celular),
        cargo: values.persona_cobranza_info.cargo || null,
      } : null,
      documento_constitutivo_info: values.documento_constitutivo_info ? {
        ...values.documento_constitutivo_info,
        nombre_registro: values.documento_constitutivo_info.nombre_registro || null,
        fecha_registro: values.documento_constitutivo_info.fecha_registro || null,
        nro_tomo: values.documento_constitutivo_info.nro_tomo || null,
        email_registro: values.documento_constitutivo_info.email_registro || null,
      } : null,
      representante_legal_info: values.representante_legal_info ? {
        ...values.representante_legal_info,
        cedula: `${values.representante_legal_info.cedulaPrefix}-${values.representante_legal_info.cedulaNumber}`,
        telefono: formatPhoneNumberWithPrefix(values.representante_legal_info.telefonoPrefix, values.representante_legal_info.telefonoNumber), // Corrected to use telefonoPrefix
        cargo: values.representante_legal_info.cargo || null,
      } : null,
    };

    try {
      const response = await fetch('/api/customers', {
        method: customer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...combinedValues, id: customer?.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Ocurrió un error inesperado.");
      }
      
      setSubmissionStatus({ success: true, message: `¡Cliente ${customer ? 'actualizado' : 'creado'} con éxito!` });
      setTimeout(() => onClose(), 2000);
    } catch (error: any) {
      setSubmissionStatus({ success: false, message: error.message });
    }
  }
  
  const getStepDescription = (currentStep: number) => {
    switch (currentStep) {
      case 0: return 'Seleccionar Usuario';
      case 1: return 'Datos de la Empresa';
      case 2: return 'Detalles de la Empresa';
      case 3: return 'Persona de Contacto';
      case 4: return 'Persona de Cobranza';
      case 5: return 'Documento Constitutivo (Opcional)';
      case 6: return 'Información Fiscal';
      case 7: return 'Representante Legal';
      case 8: return 'Suscripción Inicial';
      default: return '';
    }
  }

  const totalSteps = 8;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{customer ? "Editar Cliente" : "Crear Nuevo Cliente"}</DialogTitle>
          <DialogDescription>
            {`Paso ${step} de ${totalSteps}: ${getStepDescription(step)}`}
          </DialogDescription>

                </DialogHeader>
        
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="p-6 space-y-6 min-h-[400px]">
                      
                      {step === 0 && (
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="useExistingUser"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>
                                    Usar un usuario cliente existente
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          {useExistingUser && (
                            <FormField
                              control={form.control}
                              name="userId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Usuario Cliente</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccione un usuario" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {clientUsers.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                          {user.email}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      )}
        
                      {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Fields for Step 1 */}
                          <FormField name="businessName" control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Razón Social</FormLabel>
                              <FormControl><Input placeholder="Nombre de la empresa" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormItem>
                            <FormLabel>RIF / Cédula</FormLabel>
                            <div className="flex">
                              <FormField name="taxIdPrefix" control={form.control} render={({ field }) => (
                                <FormItem className="w-[80px]">
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="J">J</SelectItem>
                                      <SelectItem value="V">V</SelectItem>
                                      <SelectItem value="G">G</SelectItem>
                                      <SelectItem value="E">E</SelectItem>
                                      <SelectItem value="P">P</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField name="taxIdNumber" control={form.control} render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl><Input placeholder="123456789" className="rounded-l-none" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>
                          </FormItem>
                          <FormField name="email" control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormItem>
                            <FormLabel>Teléfono Principal</FormLabel>
                            <div className="flex">
                              <FormField name="phonePrefix" control={form.control} render={({ field }) => (
                                <FormItem><FormControl><Input className="w-[80px] rounded-r-none" disabled {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField name="phoneNumber" control={form.control} render={({ field }) => (
                                <FormItem className="flex-1"><FormControl><Input placeholder="4120000000" className="rounded-l-none" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                            </div>
                          </FormItem>
                          <FormField name="telefono_celular" control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono Celular (Opcional)</FormLabel>
                              <div className="flex">
                                <FormField name="telefono_celularPrefix" control={form.control} render={({ field: prefixField }) => (
                                  <FormItem className="w-[80px]">
                                    <Select onValueChange={prefixField.onChange} defaultValue={prefixField.value || "+58"} disabled={true}>
                                      <FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="+58">+58</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormControl><Input placeholder="4120000000" className="rounded-l-none" {...field} /></FormControl>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )} />
                           <FormField name="sitio_web" control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sitio Web (Opcional)</FormLabel>
                              <FormControl><Input placeholder="https://ejemplo.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField name="address" control={form.control} render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Dirección Física</FormLabel>
                              <FormControl><Textarea placeholder="Av. Principal, Edificio X, Piso Y..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      )}
        
                      {step === 2 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField name="ciudad" control={form.control} render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Ciudad</FormLabel>
                                                <FormControl><Input placeholder="Caracas" {...field} /></FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )} />
                                            <FormField name="estado" control={form.control} render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Estado</FormLabel>
                                                <FormControl><Input placeholder="Miranda" {...field} /></FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )} />
                                            <FormField name="pais" control={form.control} render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>País</FormLabel>
                                                <FormControl><Input placeholder="Venezuela" {...field} /></FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )} />
                                            <FormField name="codigo_postal" control={form.control} render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Código Postal</FormLabel>
                                                <FormControl><Input placeholder="1060" {...field} /></FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )} />
                                            <FormField name="tipo_venta" control={form.control} render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Tipo de Venta</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona el tipo de venta" /></SelectTrigger></FormControl>
                                                  <SelectContent>
                                                    <SelectItem value="MAYOR">Mayor</SelectItem>
                                                    <SelectItem value="DETAL">Detal</SelectItem>
                                                    <SelectItem value="MAYOR_Y_DETAL">Mayor y Detal</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )} />
                                            <FormField name="figura_legal" control={form.control} render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Figura Legal</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona la figura legal" /></SelectTrigger></FormControl>
                                                  <SelectContent>
                                                    <SelectItem value="PERSONA_JURIDICA">Persona Jurídica</SelectItem>
                                                    <SelectItem value="GOBIERNO_EMPRENDEDOR_CON_FIRMA_PERSONAL">Gobierno Emprendedor con Firma Personal</SelectItem>
                                                    <SelectItem value="EMPRENDEDOR_SOLO_CON_RIF">Emprendedor solo con RIF</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )} />
                                            <FormField name="tipo_empresa" control={form.control} render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Tipo de Empresa</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                                <FormMessage />
                                              </FormItem>
                                            )} />
                           <FormField name="email_user_masiva_SMS" control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Login Usuario SMS (Opcional)</FormLabel>
                              <FormControl><Input type="email" placeholder="sms_user@example.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField name="email_user_masiva_whatsapp" control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Login Usuario WhatsApp (Opcional)</FormLabel>
                              <FormControl><Input type="email" placeholder="whatsapp_user@example.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      )}
        
                      {step === 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Fields for Step 2 */}
                          <FormField name="persona_contacto_info.nombre" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Nombre de Contacto</FormLabel><FormControl><Input placeholder="Juan Pérez" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField name="persona_contacto_info.email" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Email de Contacto</FormLabel><FormControl><Input type="email" placeholder="contacto@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField name="persona_contacto_info.telefono" control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono de Contacto</FormLabel>
                              <div className="flex">
                                <FormField name="persona_contacto_info.telefonoPrefix" control={form.control} render={({ field: prefixField }) => (
                                  <FormItem className="w-[80px]">
                                    <Select onValueChange={prefixField.onChange} defaultValue={prefixField.value || "+58"} disabled={true}>
                                      <FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="+58">+58</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormControl><Input placeholder="02120000000" className="rounded-l-none" {...field} /></FormControl>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )} />
                          <FormField name="persona_contacto_info.telefono_celular" control={form.control} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Celular de Contacto (Opcional)</FormLabel>
                              <div className="flex">
                                <FormField name="persona_contacto_info.telefono_celularPrefix" control={form.control} render={({ field: prefixField }) => (
                                  <FormItem className="w-[80px]">
                                    <Select onValueChange={prefixField.onChange} defaultValue={prefixField.value || "+58"} disabled={true}>
                                      <FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="+58">+58</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormControl><Input placeholder="04120000000" className="rounded-l-none" {...field} /></FormControl>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )} />
                          <FormField name="persona_contacto_info.cargo" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="Gerente de Ventas" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      )}
        
                      {step === 4 && (
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="sameAsContact"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>
                                    Los datos de cobranza son los mismos que los de contacto
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          {!sameAsContact && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                              <FormField name="persona_cobranza_info.nombre" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField name="persona_cobranza_info.email" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="cobranza@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField name="persona_cobranza_info.telefono" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teléfono</FormLabel>
                                    <div className="flex">
                                        <FormField name="persona_cobranza_info.telefonoPrefix" control={form.control} render={({ field: prefixField }) => (
                                            <FormItem className="w-[80px]">
                                                <Select onValueChange={prefixField.onChange} defaultValue={prefixField.value || "+58"} disabled={true}>
                                                    <FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="+58">+58</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormControl><Input placeholder="02120000000" className="rounded-l-none" {...field} /></FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                              )} />
                               <FormField name="persona_cobranza_info.telefono_celular" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Celular (Opcional)</FormLabel>
                                    <div className="flex">
                                        <FormField name="persona_cobranza_info.telefono_celularPrefix" control={form.control} render={({ field: prefixField }) => (
                                            <FormItem className="w-[80px]">
                                                <Select onValueChange={prefixField.onChange} defaultValue={prefixField.value || "+58"} disabled={true}>
                                                    <FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="+58">+58</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormControl><Input placeholder="04120000000" className="rounded-l-none" {...field} /></FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                              )} />
                              <FormField name="persona_cobranza_info.cargo" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input placeholder="Analista de Cobranzas" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {step === 5 && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="documento_constitutivo_info.nombre_registro" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Nombre Registro Mercantil</FormLabel><FormControl><Input placeholder="Registro Mercantil Primero" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField name="documento_constitutivo_info.fecha_registro" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel htmlFor="fecha_registro">Fecha de Registro</FormLabel>
                                    <FormControl>
                                        <Input type="date" id="fecha_registro" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="documento_constitutivo_info.nro_tomo" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Número y Tomo</FormLabel><FormControl><Input placeholder="Nro 1, Tomo 2-A" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField name="documento_constitutivo_info.email_registro" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Email de Registro</FormLabel><FormControl><Input type="email" placeholder="registro@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                         </div>
                      )}
        
                      {step === 6 && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="taxType" control={form.control} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo de Contribuyente</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="ORDINARY">Ordinario</SelectItem>
                                    <SelectItem value="SPECIAL">Especial</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField name="isTaxExempt" control={form.control} render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm h-[40px] mt-8">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel>Exento de Impuestos</FormLabel>
                              </FormItem>
                            )} />
                          </div>
                          <FormField name="is_agente_retencion" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <div className="space-y-1 leading-none"><FormLabel>Es Agente de Retención</FormLabel></div>
                            </FormItem>
                          )} />
                          {isAgent && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
                               <FormField name="porcent_retencion_iva" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>% Retención IVA</FormLabel><FormControl><Input type="number" placeholder="75" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                               <FormField name="porcent_retencion_islr" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>% Retención ISLR</FormLabel><FormControl><Input type="number" placeholder="2" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                               <FormField name="porcent_retencion_municipio" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>% Retención Municipal</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                            </div>
                          )}
                          <FormField name="fiscalAddress" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Dirección Fiscal</FormLabel><FormControl><Textarea placeholder="Dirección para facturación..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      )}
        
                      {step === 7 && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="representante_legal_info.nombre" control={form.control} render={({ field }) => (
                              <FormItem><FormLabel>Nombre del Representante</FormLabel><FormControl><Input placeholder="Ana Gomez" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField name="representante_legal_info.email" control={form.control} render={({ field }) => (
                              <FormItem><FormLabel>Email del Representante</FormLabel><FormControl><Input type="email" placeholder="representante@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormItem>
                              <FormLabel>Cédula del Representante</FormLabel>
                              <div className="flex">
                                <FormField name="representante_legal_info.cedulaPrefix" control={form.control} render={({ field }) => (
                                  <FormItem className="w-[80px]"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="V">V</SelectItem><SelectItem value="E">E</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )} />
                                <FormField name="representante_legal_info.cedulaNumber" control={form.control} render={({ field }) => (
                                  <FormItem className="flex-1"><FormControl><Input placeholder="12345678" className="rounded-l-none" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                              </div>
                            </FormItem>
                             <FormItem>
                              <FormLabel>Teléfono del Representante</FormLabel>
                              <div className="flex">
                                <FormField name="representante_legal_info.telefonoPrefix" control={form.control} render={({ field: prefixField }) => (
                                  <FormItem className="w-[80px]">
                                    <Select onValueChange={prefixField.onChange} defaultValue={prefixField.value || "+58"} disabled={true}>
                                      <FormControl><SelectTrigger className="rounded-r-none"><SelectValue /></SelectTrigger></FormControl>
                                      <SelectContent>
                                        <SelectItem value="+58">+58</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField name="representante_legal_info.telefonoNumber" control={form.control} render={({ field }) => (
                                  <FormItem className="flex-1"><FormControl><Input placeholder="4120000000" className="rounded-l-none" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                              </div>
                            </FormItem>
                             <FormField name="representante_legal_info.cargo" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Cargo (Opcional)</FormLabel><FormControl><Input placeholder="Director" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                         </div>
                      )}
                      
                      {step === 8 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="priceListId" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lista de Precios del Cliente</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una lista" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {priceLists.map(list => <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="productId" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Producto Inicial</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedPriceList}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un producto" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {products.map(product => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {Object.keys(form.formState.errors).length > 0 && (
                                <div className="md:col-span-2">
                                <Alert variant="destructive">
                                    <AlertDescription>
                                    Se encontraron errores en el formulario. Por favor, revise los pasos anteriores.
                                    <ul>
                                        {Object.entries(form.formState.errors).map(([field, error]) => (
                                            <li key={field}>{field}: {(error as any).message || (error as any)._errors?.join(', ')}</li>
                                        ))}
                                    </ul>
                                    </AlertDescription>
                                </Alert>
                                </div>
                            )}
                        </div>
                      )}
                    </div>
        
                    <DialogFooter className="p-6 pt-0">
                       <div className="flex justify-between w-full">
                          <div>
                            {step > 0 && (
                              <Button type="button" onClick={handlePreviousStep} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                                Anterior
                              </Button>
                            )}
                          </div>
                          <div>
                            {step < totalSteps ? (
                              <Button type="button" onClick={handleNextStep} disabled={false} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                                Siguiente
                              </Button>
                            ) : (
                              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                                {form.formState.isSubmitting ? "Guardando..." : (customer ? "Actualizar Cliente" : "Guardar Cliente")}
                              </Button>
                            )}
                          </div>
                        </div>
                    </DialogFooter>
                    {submissionStatus && (
                      <div className="p-6 pt-0">
                        <Alert variant={submissionStatus.success ? "default" : "destructive"}>
                          <AlertDescription>{submissionStatus.message}</AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          );
        }
        