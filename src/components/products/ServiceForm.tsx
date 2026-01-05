"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader } from "lucide-react";
import { ProductType, BillingCycle } from "@prisma/client";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  type: z.nativeEnum(ProductType),
  billing_cycle: z.nativeEnum(BillingCycle).nullable(),
}).refine(data => data.type !== 'RECURRENT' || data.billing_cycle !== null, {
    message: "El ciclo de facturación es obligatorio para productos recurrentes.",
    path: ["billing_cycle"],
});

interface ServiceFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<z.infer<typeof formSchema>>;
  isSubmitting: boolean;
}

export function ServiceForm({ onSubmit, defaultValues, isSubmitting }: ServiceFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || { name: "", type: "RECURRENT", billing_cycle: "MONTHLY" },
  });

  const productType = form.watch("type");

  // Reset billing_cycle when type is not RECURRENT
  React.useEffect(() => {
    if (productType !== 'RECURRENT') {
      form.setValue('billing_cycle', null);
    }
  }, [productType, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Servicio</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Saco de SMS 10k" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Producto</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="RECURRENT">Recurrente</SelectItem>
                  <SelectItem value="ONE_TIME">Única Vez</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {productType === "RECURRENT" && (
            <FormField
            control={form.control}
            name="billing_cycle"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Ciclo de Facturación</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""} >
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un ciclo" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="MONTHLY">Mensual</SelectItem>
                    <SelectItem value="BIMONTHLY">Bimensual</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Form>
  );
}
