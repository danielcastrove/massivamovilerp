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
import { Customer } from "./CustomerPageClient";

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
}

// Zod schema for form validation
const customerFormSchema = z.object({
  // Step 1 fields
  businessName: z.string().min(2, { message: "La razón social debe tener al menos 2 caracteres." }),
  taxId: z.string().regex(/^[JVGPE]-\d{8,9}-\d$/, { message: "Formato de RIF/CI inválido (ej. J-12345678-9)." }),
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
  phone: z.string().min(10, { message: "El teléfono debe tener al menos 10 dígitos." }),
  address: z.string().optional(),
  // Step 2 fields
  contactPersonName: z.string().optional(),
  contactPersonEmail: z.string().email({ message: "Por favor, introduce un email de contacto válido." }).optional().or(z.literal("")),
  contactPersonPhone: z.string().optional(),

  // Step 3 fields
  taxType: z.enum(["ORDINARY", "SPECIAL"], { required_error: "Debe seleccionar un tipo de contribuyente." }),
  fiscalAddress: z.string().optional(),
  isTaxExempt: z.boolean().default(false),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export function CustomerFormModal({ isOpen, onClose, customer }: CustomerFormModalProps) {
  const [step, setStep] = useState(1);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      businessName: customer?.businessName || "",
      taxId: customer?.taxId || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
      contactPersonName: customer?.contactPersonName || "",
      contactPersonEmail: customer?.contactPersonEmail || "",
      contactPersonPhone: customer?.contactPersonPhone || "",
      taxType: customer?.taxType || "ORDINARY",
      fiscalAddress: customer?.fiscalAddress || "",
      isTaxExempt: customer?.isTaxExempt || false,
    },
  });

  useEffect(() => {
    form.reset(customer ? { ...customer } : {
      businessName: "", taxId: "", email: "", phone: "", address: "",
      contactPersonName: "", contactPersonEmail: "", contactPersonPhone: "",
      taxType: "ORDINARY", fiscalAddress: "", isTaxExempt: false,
    });
    setStep(1); // Reset to step 1 when modal opens or customer changes
  }, [customer, isOpen, form]);

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof CustomerFormValues)[] = [];
    if (step === 1) {
      fieldsToValidate = ["businessName", "taxId", "email", "phone"];
    } else if (step === 2) {
      fieldsToValidate = ["contactPersonEmail"]; // Only validate if not empty, zod handles this
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    setStep((prev) => prev - 1);
  };

  async function onSubmit(values: CustomerFormValues) {
    console.log("Form submitted:", values);
    onClose();
  }
  
  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Datos Personales';
      case 2: return 'Persona de Contacto (Opcional)';
      case 3: return 'Información Fiscal';
      default: return '';
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{customer ? "Editar Cliente" : "Crear Nuevo Cliente"}</DialogTitle>
          <DialogDescription>
            {`Paso ${step} de 3: ${getStepDescription()}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-6 space-y-4 min-h-[300px]">
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField name="businessName" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razón Social</FormLabel>
                      <FormControl><Input placeholder="Nombre de la empresa" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="taxId" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>RIF / Cédula</FormLabel>
                      <FormControl><Input placeholder="J-12345678-9" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="email" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="phone" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono Principal</FormLabel>
                      <FormControl><Input placeholder="+584120000000" {...field} /></FormControl>
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
                  <FormField name="contactPersonName" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de Contacto</FormLabel>
                      <FormControl><Input placeholder="Juan Pérez" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField name="contactPersonEmail" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Contacto</FormLabel>
                      <FormControl><Input type="email" placeholder="contacto@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField name="contactPersonPhone" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de Contacto</FormLabel>
                      <FormControl><Input placeholder="+584120000000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {step === 3 && (
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm h-full justify-center">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Exento de Impuestos</FormLabel>
                      </div>
                    </FormItem>
                  )} />
                  <FormField name="fiscalAddress" control={form.control} render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Dirección Fiscal</FormLabel>
                      <FormControl><Textarea placeholder="Dirección para facturación..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
            </div>

            <DialogFooter className="p-6 pt-0">
               <div className="flex justify-between w-full">
                  <div>
                    {step > 1 && (
                      <Button type="button" variant="outline" onClick={handlePreviousStep}>
                        Anterior
                      </Button>
                    )}
                  </div>
                  <div>
                    {step < 3 ? (
                      <Button type="button" onClick={handleNextStep}>
                        Siguiente
                      </Button>
                    ) : (
                      <Button type="submit" disabled={form.formState.isSubmitting} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                        {form.formState.isSubmitting ? "Guardando..." : "Guardar Cliente"}
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
