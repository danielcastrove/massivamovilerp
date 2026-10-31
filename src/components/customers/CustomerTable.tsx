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
import { MoreHorizontal, MessageSquare, Phone, Mail, CheckCircle2, MinusCircle, Ban } from "lucide-react";
import { Customer } from "./CustomerPageClient"; // Import the Customer interface

type CustomerStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onViewDetails: (customer: Customer) => void;
  onContact: (customer: Customer, channel: "SMS" | "WHATSAPP" | "EMAIL") => void;
  onChangeStatus: (customer: Customer, status: CustomerStatus) => void;
}

export function CustomerTable({ customers, onEdit, onDelete, onViewDetails, onContact, onChangeStatus }: CustomerTableProps) {
  return (
    <>
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
            <TableCell>{customer.settings?.taxType === 'SPECIAL' ? 'Especial' : 'Ordinario'}</TableCell>
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
                  <DropdownMenuItem onClick={() => onContact(customer, "SMS")}>
                    <MessageSquare className="mr-2 h-4 w-4 text-blue-600" /> Enviar SMS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onContact(customer, "WHATSAPP")}>
                    <Phone className="mr-2 h-4 w-4 text-emerald-600" /> Enviar WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onContact(customer, "EMAIL")}>
                    <Mail className="mr-2 h-4 w-4 text-violet-600" /> Enviar Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(customer)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(customer.id)}>
                    Eliminar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1.5">Cambiar Estado</DropdownMenuLabel>
                  {customer.status !== 'ACTIVE' && (
                    <DropdownMenuItem onClick={() => onChangeStatus(customer, "ACTIVE")} className="text-green-600 focus:text-green-700">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Activo
                    </DropdownMenuItem>
                  )}
                  {customer.status !== 'INACTIVE' && (
                    <DropdownMenuItem onClick={() => onChangeStatus(customer, "INACTIVE")}>
                      <MinusCircle className="mr-2 h-4 w-4 text-slate-500" /> Inactivo
                    </DropdownMenuItem>
                  )}
                  {customer.status !== 'BLOCKED' && (
                    <DropdownMenuItem onClick={() => onChangeStatus(customer, "BLOCKED")} className="text-red-600 focus:text-red-700">
                      <Ban className="mr-2 h-4 w-4" /> Bloqueado
                    </DropdownMenuItem>
                  )}
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
    </>
  );
}