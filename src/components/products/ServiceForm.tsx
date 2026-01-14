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
import { ProductType, BillingCycle, Category } from "@prisma/client";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  type: z.nativeEnum(ProductType),
  billing_cycle: z.nativeEnum(BillingCycle).nullable(),
  categoryId: z.string().min(1, {
    message: "Debe seleccionar una categoría.",
  }),
}).refine(data => data.type !== 'RECURRENT' || data.billing_cycle !== null, {
    message: "El ciclo de facturación es obligatorio para productos recurrentes.",
    path: ["billing_cycle"],
}); // <-- Missing closing parenthesis and curly brace


interface ServiceFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<z.infer<typeof formSchema>>;
  isSubmitting: boolean;
}

export function ServiceForm({ onSubmit, defaultValues, isSubmitting }: ServiceFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || { name: "", type: "RECURRENT", billing_cycle: "MONTHLY", categoryId: "" },
  });

  const productType = form.watch("type");

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(true);
  const [categoryError, setCategoryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }
        const data: Category[] = await response.json();
        setCategories(data);
      } catch (err) {
        if (err instanceof Error) {
          setCategoryError(err.message);
        } else {
          setCategoryError("An unknown error occurred.");
        }
        console.error("Error fetching categories:", err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

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
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoadingCategories || isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingCategories && (
                    <SelectItem value="loading" disabled>
                      Cargando categorías...
                    </SelectItem>
                  )}
                  {categoryError && (
                    <SelectItem value="error" disabled>
                      Error: {categoryError}
                    </SelectItem>
                  )}
                  {!isLoadingCategories && !categoryError && categories.length === 0 && (
                    <SelectItem value="no-categories" disabled>
                      No hay categorías disponibles
                    </SelectItem>
                  )}
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
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
        <Button type="submit" disabled={isSubmitting} className="bg-cyan-500 hover:bg-cyan-600 text-white">
          {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Form>
  );
}

