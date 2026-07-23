// massivamovilerp/src/components/customers/CustomerTable.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { Customer } from "./CustomerPageClient"; // Import the Customer interface


interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onViewDetails: (customer: Customer) => void;
}

export function CustomerTable({ customers, onEdit, onDelete, onViewDetails }: CustomerTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Razón Social</TableHead>
          <TableHead>RIF/CI</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Tipo Contribuyente</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">{customer.name}</TableCell>
            <TableCell>{customer.doc_number}</TableCell>
            <TableCell>{customer.email}</TableCell>
            <TableCell>{customer.telefono_empresa}</TableCell>
            <TableCell>{customer.settings?.taxType === 'ORDINARY' ? 'Ordinario' : 'Especial'}</TableCell>
            <TableCell>
              {customer.status === 'ACTIVE' ? (
                <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded text-[10px]">ACTIVO</span>
              ) : customer.status === 'INACTIVE' ? (
                <span className="text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded text-[10px]">INACTIVO</span>
              ) : (
                <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-[10px]">BLOQUEADO</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onEdit(customer)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(customer.id)}>
                    Eliminar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onViewDetails(customer)}>
                    Ver Detalles
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}