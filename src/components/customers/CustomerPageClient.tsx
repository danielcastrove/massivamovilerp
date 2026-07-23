
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerTable } from "./CustomerTable";
import { CustomerFormModal } from "./CustomerFormModal"; // Import the modal
import { CustomerDetailsModal } from "./CustomerDetailsModal"; // Import the details modal
import * as XLSX from 'xlsx';
import { Download, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
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
  doc_number: string;
  tipo_doc_identidad?: string;
  email: string;
  telefono_empresa: string;
  status: 'ACTIVE' | 'INACTIVE' | 'RESET' | 'BLOCKED' | 'PAUSED';
  created_at: string;
  updated_at: string;
  type: 'PERSONA' | 'EMPRESA';
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
  porcent_retencion_islr?: any;
  porcent_retencion_municipio?: any;
  user_id?: string;
  servicios_contratados?: any[];
}

export default function CustomerPageClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
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
    fetchCatalog();
    fetchCustomers();
  }, []);

  const fetchCatalog = async () => {
    try {
      const [plRes, prodRes] = await Promise.all([
        fetch('/api/pricelists'),
        fetch('/api/products')
      ]);
      if (plRes.ok) setPriceLists(await plRes.json());
      if (prodRes.ok) {
        const prods = await prodRes.json();
        setProductsMap(prods.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.name }), {}));
      }
    } catch (e) { console.error("Error cargando catálogo:", e); }
  };

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

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsDetailsModalOpen(false);
    setSelectedCustomer(undefined);
  };

  const handleExportExcel = () => {
    if (customers.length === 0) return;

    const dataToExport = customers.map(customer => {
      const servicios = (customer.servicios_contratados || []).map((s: any) => {
        const isManual = s[2];
        const precioUsd = s[4] || 0;
        const precioBs = (precioUsd * 36).toFixed(2);
        
        if (isManual) {
           return `Servicio: ${s[3]} | Precio USD: $${precioUsd} | Precio Bs: Bs.${precioBs}`;
        } else {
           const listName = priceLists.find(pl => pl.id === s[0])?.name || 'N/A';
           const prodName = productsMap[s[1]] || 'N/A';
           return `Lista: ${listName} | Producto: ${prodName}`;
        }
      }).join(' | ');

      return {
        'Razón Social': customer.name,
        'RIF/CI': customer.doc_number,
        'Email Principal': customer.email,
        'Teléfono Empresa': customer.telefono_empresa,
        'Persona Contacto': customer.persona_contacto_info?.nombre || 'N/A',
        'Email Contacto': customer.persona_contacto_info?.email || 'N/A',
        'Cargo Contacto': customer.persona_contacto_info?.cargo || 'N/A',
        'Persona Cobranza': customer.persona_cobranza_info?.nombre || 'N/A',
        'Email Cobranza': customer.persona_cobranza_info?.email || 'N/A',
        'Ciudad': customer.ciudad || 'N/A',
        'Estado': customer.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
        'Tipo Contribuyente': customer.settings?.taxType === 'ORDINARY' ? 'Ordinario' : 'Especial',
        'Servicios Contratados': servicios
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(workbook, `Listado_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <Button onClick={fetchCustomers}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex space-x-2">
          <Button 
            onClick={handleExportExcel} 
            variant="outline" 
            className="border-green-600 text-green-600 hover:bg-green-50"
            disabled={customers.length === 0 || loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Excel
          </Button>
          <Button onClick={handleCreateCustomer} className="bg-cyan-500 hover:bg-cyan-600 text-white" disabled={loading}>
            Crear Cliente
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-lg border shadow-sm">
          <Spinner className="h-12 w-12 text-cyan-600 mb-4" />
          <p className="text-slate-500 font-medium animate-pulse text-lg">Cargando datos de clientes...</p>
        </div>
      ) : (
        <CustomerTable
          customers={filteredCustomers}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
          onViewDetails={handleViewDetails}
        />
      )}

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={fetchCustomers} // Pass the fetch function as the onSuccess callback
        customer={selectedCustomer}
      />

      <CustomerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseModal}
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


