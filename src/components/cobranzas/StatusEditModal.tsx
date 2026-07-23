"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Settings2 } from "lucide-react";

const statusMap: { [key: string]: { label: string; color: string } } = {
  DRAFT: { label: "Borrador", color: "text-slate-600 bg-slate-100" },
  SENT: { label: "Enviado", color: "text-blue-600 bg-blue-100" },
  PARTIAL: { label: "Parcial", color: "text-amber-600 bg-amber-100" },
  PAID: { label: "Pagado", color: "text-emerald-600 bg-emerald-100" },
  OVERDUE: { label: "Vencido", color: "text-red-600 bg-red-100" },
  CANCELLED: { label: "Anulado", color: "text-gray-600 bg-gray-100" },
};

interface StatusEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

export default function StatusEditModal({ isOpen, onClose, invoice, onSuccess }: StatusEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(invoice?.status || "DRAFT");

  async function handleUpdateStatus() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error de red al actualizar el estado");
    } finally {
      setLoading(false);
    }
  }

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-slate-900 mb-1">
            <Settings2 className="h-5 w-5" />
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Editar Estado</DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 text-xs italic">
            Cambiar manualmente el estado de la factura #{invoice.invoice_number || "S/N"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 block">Nuevo Estado</label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full h-11 border-slate-200">
              <SelectValue placeholder="Seleccione un estado" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusMap).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${value.color.split(' ')[0].replace('text-', 'bg-')}`} />
                    {value.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleUpdateStatus} disabled={loading} className="bg-slate-900 hover:bg-slate-800">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
