"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
}

export default function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
}: NotificationModalProps) {
  const icons = {
    success: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
    error: <XCircle className="h-6 w-6 text-red-500" />,
    warning: <AlertTriangle className="h-6 w-6 text-amber-500" />,
    info: <Info className="h-6 w-6 text-cyan-500" />,
  };

  const bgColors = {
    success: "bg-emerald-50",
    error: "bg-red-50",
    warning: "bg-amber-50",
    info: "bg-cyan-50",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="flex flex-col items-center gap-4 text-center">
          <div className={`p-3 rounded-full ${bgColors[type]}`}>
            {icons[type]}
          </div>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            onClick={onClose}
            className="w-full font-bold uppercase text-xs"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
