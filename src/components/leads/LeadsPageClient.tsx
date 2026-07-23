"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Download, 
  MoreVertical, 
  Pencil, 
  Trash, 
  Phone, 
  Mail, 
  Calendar,
  ExternalLink,
  Star,
  Eye,
  LayoutGrid
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { LeadFormModal } from "./LeadFormModal";
import { LeadPdfButtons } from "./LeadPdfButtons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";

export interface Lead {
  id: string;
  nombre: string;
  apellido: string;
  cedula?: string;
  email?: string;
  telefono?: string;
  productId?: string;
  priceListId?: string;
  custom_product?: string;
  procedencia: string;
  fecha_contacto: string;
  comentarios?: string;
  fecha_llamada?: string;
  status: string;
  tipo_lead: string;
  product?: { name: string };
  priceList?: { name: string };
}

const statusConfig: Record<string, { label: string, color: string }> = {
  SIN_CONTACTAR: { label: "Sin Contactar", color: "bg-slate-100 text-slate-700" },
  PROPUESTA_ENVIADA: { label: "Propuesta Enviada", color: "bg-blue-100 text-blue-700" },
  LLAMADA_REALIZADA: { label: "Llamada Realizada", color: "bg-indigo-100 text-indigo-700" },
  CONTACTO_REALIZADO: { label: "Contacto Realizado", color: "bg-cyan-100 text-cyan-700" },
  CLIENTE_CERRADO: { label: "Cliente Cerrado", color: "bg-green-100 text-green-700" },
  ESPERANDO_APROBACION: { label: "Esperando Aprobación", color: "bg-amber-100 text-amber-700" },
};

export default function LeadsPageClient({ initialLeads = [] }: { initialLeads?: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // States for deletion
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/leads");
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sync leads when initialLeads changes
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const filteredLeads = useMemo(() => {
    let result = leads;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l => 
        `${l.nombre} ${l.apellido}`.toLowerCase().includes(term) ||
        l.email?.toLowerCase().includes(term) ||
        l.telefono?.toLowerCase().includes(term) ||
        l.custom_product?.toLowerCase().includes(term) ||
        l.product?.name?.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== "ALL") {
      result = result.filter(l => l.tipo_lead === typeFilter);
    }

    return result;
  }, [leads, searchTerm, typeFilter]);

  const handleNewLead = () => {
    setSelectedLead(undefined);
    setIsReadOnly(false);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsReadOnly(false);
    setIsModalOpen(true);
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsReadOnly(true);
    setIsModalOpen(true);
  };

  const handleDeleteLead = (id: string) => {
    setLeadToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!leadToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/leads/${leadToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchLeads();
        setIsDeleteModalOpen(false);
      } else {
        alert("Error al eliminar el prospecto");
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
    } finally {
      setIsDeleting(false);
      setLeadToDelete(null);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = leads.map(lead => ({
      'Nombre': lead.nombre,
      'Apellido': lead.apellido,
      'Cédula/RIF': lead.cedula || 'N/A',
      'Email': lead.email || 'N/A',
      'Teléfono': lead.telefono || 'N/A',
      'Tipo': lead.tipo_lead,
      'Producto Interés': lead.product?.name || lead.custom_product || 'Sin especificar',
      'Lista de Precios': lead.priceList?.name || 'N/A',
      'Procedencia': lead.procedencia,
      'Estado': statusConfig[lead.status]?.label || lead.status,
      'Fecha Contacto': format(new Date(lead.fecha_contacto), "dd/MM/yyyy"),
      'Fecha Llamada': lead.fecha_llamada ? format(new Date(lead.fecha_llamada), "dd/MM/yyyy") : 'N/A',
      'Comentarios': lead.comentarios || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    
    // Generar nombre de archivo con fecha
    const fileName = `Leads_MassivaMovil_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Leads</h1>
          <p className="text-slate-500">Administre sus prospectos y oportunidades de venta.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportExcel} 
            className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2"
            disabled={leads.length === 0}
          >
            <Download className="h-4 w-4" /> Exportar Excel
          </Button>
          <Button onClick={handleNewLead} className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2 transition-all">
            <Plus className="h-4 w-4" /> Nuevo Lead
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar prospecto por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-[200px]">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Tipo de Lead" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="VIP">💎 VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Spinner className="h-12 w-12 text-cyan-600 mb-4" />
            <p className="text-slate-500 font-medium animate-pulse text-lg">Sincronizando prospectos...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Prospecto</TableHead>
                <TableHead>Producto de Interés</TableHead>
                <TableHead>Procedencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Gestión</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    No se encontraron leads registrados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{lead.nombre} {lead.apellido}</span>
                          {lead.tipo_lead === "VIP" && <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 h-5 px-1.5"><Star className="h-3 w-3 fill-amber-500 mr-1"/> VIP</Badge>}
                        </div>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Mail className="h-3 w-3" /> {lead.email || 'N/A'}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.telefono || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{lead.product?.name || lead.custom_product || "Sin especificar"}</span>
                        {lead.priceList && <span className="text-[10px] text-slate-400 uppercase font-bold">{lead.priceList.name}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">{lead.procedencia.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[lead.status]?.color || ""}>
                        {statusConfig[lead.status]?.label || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="text-slate-600">Contacto: {format(new Date(lead.fecha_contacto), "dd/MM/yy")}</span>
                        {lead.fecha_llamada && <span className="text-cyan-600 font-medium">Llamada: {format(new Date(lead.fecha_llamada), "dd/MM/yy")}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <LeadPdfButtons lead={lead} variant="icon" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4 text-slate-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewLead(lead)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditLead(lead)} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteLead(lead.id)} 
                              className="cursor-pointer text-red-600"
                            >
                              <Trash className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que deseas eliminar este prospecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El prospecto será eliminado permanentemente de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                executeDelete();
              }} 
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeadFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchLeads}
        lead={selectedLead}
        readOnly={isReadOnly}
      />
    </div>
  );
}
