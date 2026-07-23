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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, User, Calendar, Receipt, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
}

export default function ViewPaymentModal({ isOpen, onClose, payment }: ViewPaymentModalProps) {
  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] border-slate-200 shadow-2xl overflow-hidden p-0">
        <div className="bg-cyan-600 text-white p-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-5 w-5 text-cyan-100" />
              <Badge variant="outline" className="border-cyan-400 text-cyan-50 text-[10px] font-bold uppercase">
                Registro de Pago
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              Ref: {payment.reference || "S/R"}
            </DialogTitle>
            <DialogDescription className="text-cyan-100 text-xs">
              Recibido el {format(new Date(payment.payment_date), "dd 'de' MMMM, yyyy", { locale: es })}
            </DialogDescription>
          </div>
          {payment.evidence_url && (
            <a href={payment.evidence_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-cyan-500 bg-cyan-700 text-white hover:bg-cyan-800 h-9 text-xs gap-2">
                <Download className="h-4 w-4" /> Comprobante
                </Button>
            </a>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <User className="h-3.5 w-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Cliente</span>
              </div>
              <div className="pl-5">
                <p className="font-bold text-slate-900 text-sm">{payment.customer?.name}</p>
                <p className="text-[10px] text-slate-500 font-mono uppercase">{payment.customer?.doc_number}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Método / Tasa</span>
              </div>
              <div className="pl-5">
                <p className="font-bold text-slate-900 text-sm">{payment.payment_method}</p>
                <p className="text-[10px] text-slate-500">Tasa: Bs. {Number(payment.exchange_rate).toFixed(4)}</p>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* Amount Section */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 mb-3">
              <Receipt className="h-3.5 w-3.5" />
              <span className="text-[9px] font-black uppercase tracking-widest">Detalle del Monto</span>
            </div>
            
            <div className="flex justify-between items-center px-2">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Monto USD</span>
                    <span className="text-2xl font-black text-slate-900">${Number(payment.amount_paid).toFixed(2)}</span>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-cyan-600 uppercase">Equivalente Bs.</span>
                    <span className="text-xl font-black text-cyan-700 font-mono">
                        Bs. {(Number(payment.amount_paid) * Number(payment.exchange_rate)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
          </div>

          {/* Notes Section */}
          {payment.notes && (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                <Info className="h-3.5 w-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Notas / Observaciones</span>
                </div>
                <div className="pl-5 p-3 bg-amber-50/50 rounded-lg border border-amber-100/50">
                    <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{payment.notes}"
                    </p>
                </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={onClose} className="text-xs font-bold uppercase text-slate-400">
                Cerrar Detalle
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
