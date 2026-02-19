
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerTable } from "./CustomerTable";
import { CustomerFormModal } from "./CustomerFormModal"; // Import the modal
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components

// Define the Customer interface (already defined, keeping it for context)
export interface Customer {
  id: string;
  name: string;
  doc_number: string; // RIF o CI
  email: string;
  telefono_empresa: string;
  taxType: 'ORDINARY' | 'SPECIAL'; // Assuming these types based on schema.prisma
  is_active: boolean;
  createdAt: string;
  // Add other fields needed for form to match zod schema more closely
  direccion_fiscal?: string;
  persona_contacto_info?: any;
  persona_cobranza_info?: any;
  documento_constitutivo_info?: any;
  representante_legal_info?: any;
  sitio_web?: string;
  telefono_celular?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
  codigo_postal?: string;
  tipo_venta?: 'MAYOR' | 'DETAL' | 'MAYOR_Y_DETAL';
  figura_legal?: 'PERSONA_JURIDICA' | 'GOBIERNO_EMPRENDEDOR_CON_FIRMA_PERSONAL' | 'EMPRENDEDOR_SOLO_CON_RIF';
  tipo_empresa?: 'EMPRESA' | 'FABRICANTE' | 'PRODUCTOR' | 'DISTRIBUIDORA' | 'MAYORISTA' | 'COMERCIO' | 'RESTAURANT' | 'SUPERMERCADO' | 'ABASTO' | 'PANADERIA' | 'FARMACIA';
  email_user_masiva_SMS?: string;
  email_user_masiva_whatsapp?: string;
  settings?: any;
  is_agente_retencion?: boolean;
  porcent_retencion_iva?: any;
  porcent_retencion_islr?: any;
  porcent_retencion_municipio?: any;
  user_id?: string;
  price_list_id?: string;
  productId?: string;
}

export default function CustomerPageClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDeleteId, setCustomerToDeleteId] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      const data = await response.json();
      setCustomers(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer: Customer) =>
    (customer.name && customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.doc_number && customer.doc_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateCustomer = () => {
    setSelectedCustomer(undefined);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(undefined);
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomerToDeleteId(customerId);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!customerToDeleteId) return;
    try {
      const response = await fetch(`/api/customers/${customerToDeleteId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }
      // Re-fetch customers to update the list after deletion
      fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsDeleteModalOpen(false);
      setCustomerToDeleteId(null);
    }
  };

  if (loading && customers.length === 0) { // Show loading only on initial load
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Clientes</h1>

      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleCreateCustomer} className="bg-cyan-500 hover:bg-cyan-600 text-white">
          Crear Cliente
        </Button>
      </div>

      <CustomerTable
        customers={filteredCustomers}
        onEdit={handleEditCustomer}
        onDelete={handleDeleteCustomer}
      />

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={fetchCustomers} // Pass the fetch function as the onSuccess callback
        customer={selectedCustomer}
      />

      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el cliente y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-500 hover:bg-red-600">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


