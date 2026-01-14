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
  businessName: string;
  taxId: string; // RIF o CI
  email: string;
  phone: string;
  taxType: 'ORDINARY' | 'SPECIAL'; // Assuming these types based on schema.prisma
  isActive: boolean;
  createdAt: string;
  // Add other fields needed for form to match zod schema more closely
  address?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  fiscalAddress?: string;
  isTaxExempt?: boolean;
}

// Mock Data (keeping this as is)
const mockCustomers: Customer[] = [
  {
    id: "cus_001",
    businessName: "Tech Solutions Inc.",
    taxId: "J-12345678-9",
    email: "contact@techsolutions.com",
    phone: "+584121234567",
    taxType: "ORDINARY",
    isActive: true,
    createdAt: "2023-01-15",
    address: "123 Main St",
    contactPersonName: "John Doe",
    contactPersonEmail: "john.doe@techsolutions.com",
    contactPersonPhone: "555-1234",
    fiscalAddress: "123 Main St",
    isTaxExempt: false,
  },
  {
    id: "cus_002",
    businessName: "Global Innovators C.A.",
    taxId: "V-98765432-1",
    email: "info@globalinnovators.net",
    phone: "+584249876543",
    taxType: "SPECIAL",
    isActive: true,
    createdAt: "2023-02-20",
    address: "456 Oak Ave",
    contactPersonName: "Jane Smith",
    contactPersonEmail: "jane.smith@globalinnovators.net",
    contactPersonPhone: "555-5678",
    fiscalAddress: "456 Oak Ave",
    isTaxExempt: false,
  },
  {
    id: "cus_003",
    businessName: "Agro Farms S.A.",
    taxId: "J-55555555-0",
    email: "admin@agrofarms.org",
    phone: "+584145551212",
    taxType: "ORDINARY",
    isActive: false,
    createdAt: "2023-03-10",
    address: "789 Pine Ln",
    contactPersonName: "Peter Jones",
    contactPersonEmail: "peter.jones@agrofarms.org",
    contactPersonPhone: "555-8765",
    fiscalAddress: "789 Pine Ln",
    isTaxExempt: true,
  },
  {
    id: "cus_004",
    businessName: "Creative Designs Estudio",
    taxId: "V-11111111-1",
    email: "hello@creativedesigns.com",
    phone: "+584161112233",
    taxType: "ORDINARY",
    isActive: true,
    createdAt: "2023-04-05",
    address: "101 Art St",
    contactPersonName: "Anna Lee",
    contactPersonEmail: "anna.lee@creativedesigns.com",
    contactPersonPhone: "555-4321",
    fiscalAddress: "101 Art St",
    isTaxExempt: false,
  },
];

export default function CustomerPageClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined);

  const filteredCustomers = mockCustomers.filter((customer) =>
    customer.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

