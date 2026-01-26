
// massivamovilerp/src/components/customers/CustomerPageClient.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerTable } from "./CustomerTable";
import { CustomerFormModal } from "./CustomerFormModal"; // Import the modal

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);

  const filteredCustomers = [].filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.doc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCustomer = () => {
    setSelectedCustomer(undefined); // Clear any previously selected customer
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(undefined); // Clear selected customer when modal closes
  };

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

      <CustomerTable customers={filteredCustomers} onEdit={handleEditCustomer} />

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        customer={selectedCustomer}
      />
    </div>
  );
}


