import React, { useState, useMemo } from 'react';
import { PDFDownloadLink, usePDF, BlobProvider } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { LeadPdfTemplate } from './LeadPdfTemplate';
import { Lead } from './LeadsPageClient';
import { Download, Eye, Loader2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LeadPdfButtonsProps {
  lead: Lead;
  variant?: 'full' | 'icon';
}

export const LeadPdfButtons: React.FC<LeadPdfButtonsProps> = ({ lead, variant = 'full' }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Memoize the document to prevent infinite re-renders
  // Following rerender-memo best practice
  const document = useMemo(() => <LeadPdfTemplate lead={lead} />, [lead]);

  if (variant === 'icon') {
    return (
      <div className="flex gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => setIsPreviewOpen(true)}
          title="Ver PDF"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <PDFDownloadLink
          document={document}
          fileName={`Lead_${lead.nombre}_${lead.apellido}.pdf`}
        >
          {({ loading }) => (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
              disabled={loading}
              title="Descargar PDF"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          )}
        </PDFDownloadLink>

        {isPreviewOpen && (
          <PreviewDialog 
            isOpen={isPreviewOpen} 
            onClose={() => setIsPreviewOpen(false)} 
            document={document}
            leadName={`${lead.nombre} ${lead.apellido}`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
        onClick={() => setIsPreviewOpen(true)}
      >
        <Eye className="h-4 w-4" /> Ver PDF
      </Button>

      <PDFDownloadLink
        document={document}
        fileName={`Lead_${lead.nombre}_${lead.apellido}.pdf`}
      >
        {({ loading }) => (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar PDF
          </Button>
        )}
      </PDFDownloadLink>

      {isPreviewOpen && (
        <PreviewDialog 
          isOpen={isPreviewOpen} 
          onClose={() => setIsPreviewOpen(false)} 
          document={document}
          leadName={`${lead.nombre} ${lead.apellido}`}
        />
      )}
    </div>
  );
};

interface PreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: React.ReactElement;
  leadName: string;
}

const PreviewDialog = ({ isOpen, onClose, document, leadName }: PreviewDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-slate-50">
          <DialogTitle className="flex items-center gap-2 text-slate-700">
            <FileText className="h-5 w-5 text-blue-600" />
            Vista Previa: {leadName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 bg-slate-200 relative">
          <BlobProvider document={document as any}>
            {({ url, loading, error }) => {
              if (loading) {
                return (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-2" />
                    <p className="text-slate-600 font-medium">Generando vista previa...</p>
                  </div>
                );
              }
              if (error) {
                return (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-red-500">Error al cargar la vista previa.</p>
                  </div>
                );
              }
              return url ? (
                <iframe src={url} className="w-full h-full border-none" title="PDF Preview" />
              ) : null;
            }}
          </BlobProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
};
