// massivamovilerp/src/components/customers/CustomerDetailsModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Customer } from "./CustomerPageClient";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PDFDownloadLink } from "@react-pdf/renderer";
import CustomerDetailsPDF from "./CustomerDetailsPDF";
import { Download, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
}

export function CustomerDetailsModal({ isOpen, onClose, customer }: CustomerDetailsModalProps) {
  const customerData = customer;

  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [priceListsById, setPriceListsById] = useState<Record<string, string>>({});
  const [productPricesByListAndProduct, setProductPricesByListAndProduct] = useState<
    Record<string, Record<string, { productName?: string; priceUsd?: number }>>
  >({});

  const servicios = useMemo(() => {
    const raw = (customerData as any)?.servicios_contratados;
    return Array.isArray(raw) ? raw : [];
  }, [customerData]);

  useEffect(() => {
    if (!isOpen || !customerData) return;

    const fetchData = async () => {
      try {
        const [bcvRes, plRes] = await Promise.all([
          fetch("/api/parametros"),
          fetch("/api/pricelists"),
        ]);

        if (bcvRes.ok) {
          const rate = await bcvRes.json();
          const n = Number(rate);
          setBcvRate(Number.isFinite(n) ? n : null);
        } else {
          setBcvRate(null);
        }

        if (plRes.ok) {
          const lists = await plRes.json();
          const map: Record<string, string> = {};
          if (Array.isArray(lists)) {
            for (const l of lists) {
              if (l?.id) map[String(l.id)] = String(l.name || l.id);
            }
          }
          setPriceListsById(map);
        } else {
          setPriceListsById({});
        }

        // Pre-cargar precios por lista para resolver nombre/precio del servicio
        const uniqueListIds = Array.from(
          new Set(servicios.map((s: any[]) => s?.[0]).filter(Boolean).map((x: any) => String(x)))
        );

        const results = await Promise.all(
          uniqueListIds.map(async (listId) => {
            const r = await fetch(`/api/productprices?price_list_id=${listId}`);
            if (!r.ok) return [listId, []] as const;
            const data = await r.json();
            return [listId, Array.isArray(data) ? data : []] as const;
          })
        );

        const pricesMap: Record<string, Record<string, { productName?: string; priceUsd?: number }>> = {};
        for (const [listId, rows] of results) {
          const byProduct: Record<string, { productName?: string; priceUsd?: number }> = {};
          for (const pp of rows as any[]) {
            const pid = pp?.product_id ? String(pp.product_id) : undefined;
            if (!pid) continue;
            byProduct[pid] = {
              productName: pp?.product?.name ? String(pp.product.name) : undefined,
              priceUsd: pp?.price_usd != null ? Number(pp.price_usd) : undefined,
            };
          }
          pricesMap[String(listId)] = byProduct;
        }
        setProductPricesByListAndProduct(pricesMap);
      } catch {
        // No romper el modal si falla algo
      }
    };

    fetchData();
  }, [isOpen, customerData, servicios]);

  const serviciosRows = useMemo(() => {
    return servicios.map((s: any[]) => {
      const listId = s?.[0] ? String(s[0]) : null;
      const itemIdOrName = s?.[1] != null ? String(s[1]) : null;
      const isManual = Boolean(s?.[2]);
      const customName = s?.[3] != null ? String(s[3]) : null;
      const manualPriceUsdRaw = s?.[4];

      const listName = listId ? (priceListsById[listId] || listId) : "N/A";

      let serviceName = "N/A";
      let priceUsd: number | null = null;

      if (!listId) {
        serviceName = customName || itemIdOrName || "N/A";
        const n = Number(manualPriceUsdRaw);
        priceUsd = Number.isFinite(n) ? n : null;
      } else if (isManual) {
        serviceName = customName || itemIdOrName || "N/A";
        const n = Number(manualPriceUsdRaw);
        priceUsd = Number.isFinite(n) ? n : null;
      } else {
        const byProduct = productPricesByListAndProduct[listId] || {};
        const resolved = itemIdOrName ? byProduct[itemIdOrName] : undefined;
        serviceName = resolved?.productName || customName || itemIdOrName || "N/A";
        priceUsd = resolved?.priceUsd != null && Number.isFinite(resolved.priceUsd) ? resolved.priceUsd : null;
      }

      const priceBs =
        bcvRate != null && priceUsd != null && Number.isFinite(bcvRate) ? priceUsd * bcvRate : null;

      return { listName, serviceName, priceUsd, priceBs };
    });
  }, [servicios, priceListsById, productPricesByListAndProduct, bcvRate]);

  if (!customerData) return null;

  const DetailItem = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
    <div className="flex flex-col space-y-1 py-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || "N/A"}</span>
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2 border-l-4 border-cyan-500 pl-2 bg-slate-50 py-1">
      {children}
    </h3>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900">{customer.name}</DialogTitle>
              <p className="text-sm text-slate-500 mt-1">RIF/CI: {customer.doc_number}</p>
            </div>
            <div className="flex items-center space-x-3">
              <PDFDownloadLink
                document={<CustomerDetailsPDF customer={customer} serviciosResueltos={serviciosRows} />}
                fileName={`Detalles_Cliente_${customer.name.replace(/\s+/g, '_')}.pdf`}
              >
                {({ loading }: any) => (
                  <Button variant="outline" size="sm" disabled={loading} className="border-cyan-500 text-cyan-600 hover:bg-cyan-50">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Descargar PDF
                  </Button>
                )}
              </PDFDownloadLink>
              <Badge variant={customer.status === 'ACTIVE' ? "default" : "destructive"} className={customer.status === 'ACTIVE' ? "bg-green-500" : ""}>
                {customer.status === 'ACTIVE' ? 'Activo' : customer.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="contacto">Contactos</TabsTrigger>
                <TabsTrigger value="legal">Legal/Reg.</TabsTrigger>
                <TabsTrigger value="fiscal">Fiscal/Susc.</TabsTrigger>
              </TabsList>

              {/* GENERAL & LOCATION */}
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <SectionTitle>Datos de Identificación</SectionTitle>
                    <DetailItem label="Razón Social" value={customer.name} />
                    <DetailItem label="Email Principal" value={customer.email} />
                    <DetailItem label="Teléfono Empresa" value={customer.telefono_empresa} />
                    <DetailItem label="Celular" value={customer.telefono_celular} />
                    <DetailItem label="Sitio Web" value={customer.sitio_web} />
                  </div>
                  <div>
                    <SectionTitle>Ubicación</SectionTitle>
                    <DetailItem label="Dirección Fiscal" value={customer.direccion_fiscal} />
                    <DetailItem label="Ciudad" value={customer.ciudad} />
                    <DetailItem label="Estado" value={customer.estado} />
                    <DetailItem label="País" value={customer.pais} />
                    <DetailItem label="Código Postal" value={customer.codigo_postal} />
                  </div>
                </div>
                <Separator />
                <div>
                  <SectionTitle>Perfil de Empresa</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DetailItem label="Tipo de Cliente" value={customer.type} />
                    <DetailItem label="Tipo de Empresa" value={customer.tipo_empresa} />
                    <DetailItem label="Figura Legal" value={customer.figura_legal?.replace(/_/g, ' ')} />
                    <DetailItem label="Tipo de Venta" value={customer.tipo_venta} />
                    <DetailItem label="Usuario SMS" value={customer.email_user_masiva_SMS} />
                    <DetailItem label="Usuario WhatsApp" value={customer.email_user_masiva_whatsapp} />
                  </div>
                </div>
              </TabsContent>

              {/* CONTACTS */}
              <TabsContent value="contacto" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-cyan-700 mb-3 flex items-center">
                      <span className="bg-cyan-100 p-1 rounded mr-2">👤</span>
                      Persona de Contacto
                    </h4>
                    <DetailItem label="Nombre" value={customer.persona_contacto_info?.nombre} />
                    <DetailItem label="Cargo" value={customer.persona_contacto_info?.cargo} />
                    <DetailItem label="Email" value={customer.persona_contacto_info?.email} />
                    <DetailItem label="Teléfono" value={customer.persona_contacto_info?.telefono} />
                    <DetailItem label="Celular" value={customer.persona_contacto_info?.telefono_celular} />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-indigo-700 mb-3 flex items-center">
                      <span className="bg-indigo-100 p-1 rounded mr-2">💰</span>
                      Persona de Cobranza
                    </h4>
                    <DetailItem label="Nombre" value={customer.persona_cobranza_info?.nombre} />
                    <DetailItem label="Cargo" value={customer.persona_cobranza_info?.cargo} />
                    <DetailItem label="Email" value={customer.persona_cobranza_info?.email} />
                    <DetailItem label="Teléfono" value={customer.persona_cobranza_info?.telefono} />
                    <DetailItem label="Celular" value={customer.persona_cobranza_info?.telefono_celular} />
                  </div>
                </div>
              </TabsContent>

              {/* LEGAL */}
              <TabsContent value="legal" className="space-y-6">
                <div>
                  <SectionTitle>Registro Mercantil</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Registro" value={customer.documento_constitutivo_info?.nombre_registro} />
                    <DetailItem label="Fecha Registro" value={customer.documento_constitutivo_info?.fecha_registro} />
                    <DetailItem label="Número/Tomo" value={customer.documento_constitutivo_info?.nro_tomo} />
                    <DetailItem label="Email Registro" value={customer.documento_constitutivo_info?.email_registro} />
                  </div>
                </div>
                <Separator />
                <div>
                  <SectionTitle>Representante Legal</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DetailItem label="Nombre" value={customer.representante_legal_info?.nombre} />
                    <DetailItem label="Cargo" value={customer.representante_legal_info?.cargo} />
                    <DetailItem label="Cédula" value={`${customer.representante_legal_info?.cedulaPrefix}-${customer.representante_legal_info?.cedulaNumber}`} />
                    <DetailItem label="Email" value={customer.representante_legal_info?.email} />
                    <DetailItem label="Teléfono" value={customer.representante_legal_info?.telefonoNumber} />
                  </div>
                </div>
              </TabsContent>

              {/* FISCAL & SUBSCRIPTION */}
              <TabsContent value="fiscal" className="space-y-6">
                <div>
                  <SectionTitle>Datos Fiscales</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Tipo Contribuyente" value={customer.settings?.taxType === 'ORDINARY' ? 'Ordinario' : 'Especial'} />
                    <DetailItem label="Exento de Impuestos" value={customer.settings?.isTaxExempt ? "Sí" : "No"} />
                    <DetailItem label="Agente de Retención" value={customer.is_agente_retencion ? "Sí" : "No"} />
                    <div className="flex space-x-4">
                      <DetailItem label="% IVA" value={`${(customer as any).porcent_retencion_iva || 0}%`} />
                      <DetailItem label="% ISLR" value={`${customer.porcent_retencion_islr || 0}%`} />
                      <DetailItem label="% Mun." value={`${customer.porcent_retencion_municipio || 0}%`} />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <SectionTitle>Servicios Contratados</SectionTitle>
                  <div className="text-xs text-slate-500 mb-3">
                    Tasa BCV: <span className="font-mono font-bold text-slate-700">{bcvRate != null ? `Bs. ${bcvRate.toFixed(4)}` : "N/A"}</span>
                  </div>

                  {serviciosRows.length === 0 ? (
                    <div className="text-sm text-slate-500">N/A</div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase text-slate-500">
                        <div>Lista</div>
                        <div>Servicio</div>
                        <div className="md:text-right">Precio (USD)</div>
                        <div className="md:text-right">Precio (Bs)</div>
                      </div>
                      <div className="divide-y">
                        {serviciosRows.map((r, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 px-4 py-3 text-sm">
                            <div className="text-slate-800">{r.listName || "N/A"}</div>
                            <div className="text-slate-900 font-medium">{r.serviceName || "N/A"}</div>
                            <div className="md:text-right font-mono text-slate-800">
                              {r.priceUsd != null ? `$${r.priceUsd.toFixed(2)}` : "N/A"}
                            </div>
                            <div className="md:text-right font-mono text-slate-800">
                              {r.priceBs != null ? `Bs. ${r.priceBs.toFixed(2)}` : "N/A"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
