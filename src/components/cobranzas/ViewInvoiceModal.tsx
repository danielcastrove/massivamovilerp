"use client";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Download, User, Calendar, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

export default function ViewInvoiceModal({ isOpen, onClose, invoice }: ViewInvoiceModalProps) {
  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] border-slate-200 shadow-2xl overflow-hidden p-0">
        <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-cyan-400" />
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 text-[10px] font-bold uppercase">
                {invoice.type} {invoice.status}
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              #{invoice.invoice_number || "SIN NÚMERO"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Generado el {format(new Date(invoice.issue_date), "dd 'de' MMMM, yyyy", { locale: es })}
            </DialogDescription>
          </div>
          <Button variant="outline" className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700 h-9 text-xs gap-2">
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400">
                <User className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Información del Cliente</span>
              </div>
              <div className="pl-6">
                <p className="font-bold text-slate-900 text-sm">{invoice.customer?.name}</p>
                <p className="text-xs text-slate-500 font-mono uppercase">{invoice.customer?.doc_number}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Vencimiento del Servicio</span>
              </div>
              <div className="pl-6">
                <p className="font-bold text-slate-900 text-sm">
                  {format(new Date(invoice.proximo_vencimiento_producto || invoice.due_date), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
                <p className="text-xs text-slate-500 italic">Tasa BCV: Bs. {invoice.currency_rate.toFixed(4)}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* Items Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Receipt className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Desglose de Conceptos</span>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent text-[10px] font-bold uppercase tracking-tighter">
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Unit. USD</TableHead>
                    <TableHead className="text-right">Total USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.invoice_items?.map((item: any, idx: number) => (
                    <TableRow key={idx} className="text-[11px] border-slate-50">
                      <TableCell className="font-medium text-slate-900">
                        {item.is_custom ? item.custom_name : (item.product?.name || "Producto")}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">${Number(item.unit_price_usd || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold font-mono">${Number(item.total_usd || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-xs text-slate-500 font-medium uppercase tracking-tighter">
                <span>Subtotal</span>
                <span className="text-slate-900">${(invoice.subtotal_usd || 0).toFixed(2)}</span>
              </div>
              {(invoice.tax_amount_usd || 0) > 0 && (
                <div className="flex justify-between text-xs text-slate-500 font-medium uppercase tracking-tighter">
                  <span>IVA (16%)</span>
                  <span className="text-slate-900">${(invoice.tax_amount_usd || 0).toFixed(2)}</span>
                </div>
              )}
              {(invoice.igtf_amount_usd || 0) > 0 && (
                <div className="flex justify-between text-xs text-slate-500 font-medium uppercase tracking-tighter">
                  <span>IGTF (3%)</span>
                  <span className="text-slate-900">${(invoice.igtf_amount_usd || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-400">Total USD</span>
                <span className="text-xl font-black text-slate-900 tracking-tighter">${(invoice.total_usd || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end bg-cyan-50 p-2 rounded-lg border border-cyan-100">
                <span className="text-[10px] font-black uppercase text-cyan-600">Total Bolívares</span>
                <span className="text-sm font-black text-cyan-700 font-mono">Bs. {(invoice.total_bs || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
