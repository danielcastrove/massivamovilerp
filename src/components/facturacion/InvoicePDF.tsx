import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#333',
    backgroundColor: '#fff',
  },
  // Cabecera principal
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  logoColumn: {
    width: '30%',
  },
  companyInfoColumn: {
    width: '40%',
    paddingLeft: 10,
  },
  invoiceInfoColumn: {
    width: '30%',
    alignItems: 'flex-end',
  },
  logo: {
    width: 120,
    marginBottom: 5,
  },
  companyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6d28d9',
    marginBottom: 2,
  },
  companyText: {
    fontSize: 7,
    color: '#666',
    marginBottom: 1,
  },
  
  // Recuadro del número de factura
  invoiceNumberBox: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#6d28d9',
    borderRadius: 4,
    width: '100%',
    padding: 8,
    textAlign: 'center',
    backgroundColor: '#f5f3ff',
  },
  invoiceLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6d28d9',
    textTransform: 'uppercase',
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  controlNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#333', // Default black
  },
  controlNumberValue: {
    color: '#dc2626', // Intense red
  },

  // Sección de datos del cliente
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: 4,
    marginBottom: 5,
    textTransform: 'uppercase',
    color: '#4b5563',
  },
  clientBox: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    flexDirection: 'row',
  },
  clientCol: {
    width: '50%',
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  fieldLabel: {
    fontWeight: 'bold',
    width: '50%',
    flexShrink: 0,
    fontSize: 7,
    color: '#666',
  },
  fieldValue: {
    width: '50%',
    fontSize: 8,
  },

  // Tabla de productos mejorada con 7 columnas
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#6d28d9',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 2,
    alignItems: 'center', // Centrado vertical de los textos del header
  },
  tableHeaderText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center', // Centrado vertical de los textos de la fila
  },
  colCode: { width: '15%' },
  colDesc: { width: '20%' },
  colQty: { width: '5%', textAlign: 'center' },
  colPriceUsd: { width: '15%', textAlign: 'right' },
  colPriceBs: { width: '15%', textAlign: 'right' },
  colTotalUsd: { width: '15%', textAlign: 'right' },
  colTotalBs: { width: '15%', textAlign: 'right' },

  // Totales y Liquidación
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  notesBox: {
    width: '45%',
    padding: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  totalsBox: {
    width: '52%',
  },
  totalsTable: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
  },
  totalsTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#f3f4f6',
    paddingVertical: 4,
  },
  totalsTableLabel: {
    width: '40%',
    fontSize: 7,
    fontWeight: 'bold',
    color: '#475569',
    paddingLeft: 6,
  },
  totalsTableCol: {
    width: '30%',
    fontSize: 8,
    textAlign: 'right',
    paddingRight: 6,
  },
  totalsTableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f3ff',
    paddingVertical: 6,
  },
  totalsTableTotalLabel: {
    width: '40%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6d28d9',
    paddingLeft: 6,
  },
  totalsTableTotalValue: {
    width: '30%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6d28d9',
    textAlign: 'right',
    paddingRight: 6,
  },

  // Bloque Bolívares (BCV)
  bcvBlock: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
  },
  bcvTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  bcvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  netPayRow: {
    marginTop: 5,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#6d28d9',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#999',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#eee',
    paddingTop: 10,
  }
});

interface InvoicePDFProps {
  invoice: any;
}

const InvoicePDF = ({ invoice }: InvoicePDFProps) => {
  const isFactura = invoice.type === 'FACTURA';
  const isUsdOnly = invoice.currency_mode === 'USD_ONLY';
  const currencyRate = Number(invoice.currency_rate);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://massivamovilerp.vercel.app';
  
  const formatDate = (d: any) => {
    if (!d) return 'N/A';
    const str = typeof d === 'string' ? d.replace(' ', 'T') : d;
    return new Date(str).toLocaleDateString('es-VE');
  };
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* CABECERA AL ESTILO MASSIVAMOVIL */}
        <View style={styles.header}>
          <View style={styles.logoColumn}>
            <Image src={`${baseUrl}/massivamovil.png`} style={styles.logo} />
            <Text style={styles.companyTitle}>MASSIVAMOVIL, C.A.</Text>
            {isFactura && <Text style={styles.companyText}>RIF: J-40086828-9</Text>}
          </View>
          
          <View style={styles.companyInfoColumn}>
            <Text style={[styles.companyText, { marginTop: 15 }]}>Av. Principal de Las Mercedes, Edif. Centro Financiero,</Text>
            <Text style={styles.companyText}>Piso 5, Oficina 5-A. Caracas, Venezuela.</Text>
            <Text style={styles.companyText}>Teléfono: +58 (212) 123.45.67</Text>
            <View style={{ flexDirection: 'row' }}>
              <Text style={styles.companyText}>Email: </Text>
              <Text style={styles.companyText}>administracion@massivamovil.com</Text>
            </View>
            <Text style={styles.companyText}>Web: www.massivamovil.com</Text>
          </View>

          <View style={styles.invoiceInfoColumn}>
            <View style={styles.invoiceNumberBox}>
              <Text style={styles.invoiceLabel}>
                {isFactura ? 'Factura de Venta' : (isUsdOnly ? 'Invoice' : 'Recibo de Pago')}
              </Text>
              {isFactura && (
                <Text style={styles.controlNumber}>
                  Nro. Control: 00-
                  <Text style={styles.controlNumberValue}>
                    {invoice.control_number ? String(invoice.control_number).padStart(6, '0') : invoice.id.slice(0, 8).toUpperCase()}
                  </Text>
                </Text>
              )}
            </View>
            <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>
                  {isFactura ? 'Factura Nº:' : (isUsdOnly ? 'Invoice Nº:' : 'Recibo Nº:')}
                </Text>
                <Text style={[styles.fieldValue, { fontWeight: 'bold' }]}>
                  {invoice.invoice_number ? String(invoice.invoice_number).padStart(6, '0') : invoice.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Emisión:</Text>
                <Text style={styles.fieldValue}>{formatDate(invoice.issue_date)}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Venc. Servicio:</Text>
                <Text style={styles.fieldValue}>{formatDate(invoice.due_date)}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Venc. Factura:</Text>
                <Text style={styles.fieldValue}>{formatDate(invoice.proximo_vencimiento_producto)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* DATOS DEL CLIENTE */}
        <Text style={styles.sectionTitle}>Datos del Cliente / Receptor</Text>
        <View style={styles.clientBox}>
          <View style={styles.clientCol}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Razón Social:</Text>
              <Text style={[styles.fieldValue, { fontWeight: 'bold' }]}>{invoice.customer.name}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>RIF / C.I.:</Text>
              <Text style={styles.fieldValue}>{invoice.customer.doc_number}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Dirección:</Text>
              <Text style={styles.fieldValue}>{invoice.customer.direccion_fiscal || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.clientCol, { paddingLeft: 20 }]}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Contacto:</Text>
              <Text style={styles.fieldValue}>{(invoice.customer.persona_contacto_info as any)?.nombre || 'N/A'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Teléfono:</Text>
              <Text style={styles.fieldValue}>{invoice.customer.telefono_empresa || 'N/A'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email:</Text>
              <Text style={styles.fieldValue}>{invoice.customer.email || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* TABLA DE CONCEPTOS REESTRUCTURADA */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colCode, isUsdOnly ? { width: '25%' } : {}]}>SKU</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc, isUsdOnly ? { width: '40%' } : {}]}>Descripción del Servicio</Text>
            <Text style={[styles.tableHeaderText, styles.colQty, isUsdOnly ? { width: '10%' } : {}]}>Cant.</Text>
            <Text style={[styles.tableHeaderText, styles.colPriceUsd, isUsdOnly ? { width: '12.5%' } : {}]}>Precio USD</Text>
            {!isUsdOnly && <Text style={[styles.tableHeaderText, styles.colPriceBs]}>Precio BS</Text>}
            <Text style={[styles.tableHeaderText, styles.colTotalUsd, isUsdOnly ? { width: '12.5%' } : {}]}>Total USD</Text>
            {!isUsdOnly && <Text style={[styles.tableHeaderText, styles.colTotalBs]}>Total BS</Text>}
          </View>

          {(invoice.invoice_items || []).map((item: any, index: number) => (
            <View key={index} style={[styles.tableRow, index % 2 === 0 ? {} : { backgroundColor: '#f9fafb' }]}>
              <Text style={[styles.fieldValue, styles.colCode, isUsdOnly ? { width: '25%' } : {}]}>{item.product?.sku || `SRV-${index + 101}`}</Text>
              <Text style={[styles.fieldValue, styles.colDesc, isUsdOnly ? { width: '40%' } : {}]}>{item.product?.name || 'Servicio Profesional'}</Text>
              <Text style={[styles.fieldValue, styles.colQty, isUsdOnly ? { width: '10%' } : {}]}>{item.quantity}</Text>
              <Text style={[styles.fieldValue, styles.colPriceUsd, isUsdOnly ? { width: '12.5%' } : {}]}>{Number(item.unit_price_usd).toFixed(2)}</Text>
              {!isUsdOnly && <Text style={[styles.fieldValue, styles.colPriceBs]}>{(Number(item.unit_price_usd) * currencyRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>}
              <Text style={[styles.fieldValue, styles.colTotalUsd, isUsdOnly ? { width: '12.5%' } : {}]}>{Number(item.total_usd).toFixed(2)}</Text>
              {!isUsdOnly && <Text style={[styles.fieldValue, styles.colTotalBs]}>{(Number(item.total_usd) * currencyRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>}
            </View>
          ))}
        </View>

        {/* TOTALES Y LIQUIDACIÓN REESTRUCTURADA */}
        <View style={styles.summarySection}>
          <View style={styles.notesBox}>
            <Text style={[styles.fieldLabel, { marginBottom: 5 }]}>Observaciones y Condiciones:</Text>
            <Text style={{ fontSize: 7, color: '#4b5563', lineHeight: 1.4 }}>
              {!isUsdOnly && `• El pago de esta factura debe realizarse en Bolívares a la tasa oficial del BCV vigente a la fecha de la transacción (Tasa del día: Bs. ${currencyRate.toFixed(4)}). \n`}
              • El Pago de esta factura en una moneda distinta a la de curso legal y sin intermediación bancaria, genera un adicional de 3% sobre el 
            </Text>
            <Text style={{ fontSize: 7, color: '#4b5563', lineHeight: 1.4 }}>monto pagado por concepto de IGTF. Según G.O Nro. 6.687 de fecha 25/02/2022.{"\n"}
            • Favor reportar su comprobante de pago al correo:</Text>
            <Text style={{ fontSize: 7, color: '#4b5563', lineHeight: 1.4 }}>administracion@massivamovil.com</Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalsTable}>
              {/* Header de la Tabla de Totales */}
              <View style={styles.totalsTableHeader}>
                <Text style={[styles.totalsTableLabel, isUsdOnly ? { width: '60%' } : {}]}>Concepto</Text>
                <Text style={[styles.totalsTableCol, isUsdOnly ? { width: '40%' } : {}]}>Monto USD</Text>
                {!isUsdOnly && <Text style={styles.totalsTableCol}>Monto BS</Text>}
              </View>

              {/* Fila Subtotal */}
              <View style={styles.totalsTableRow}>
                <Text style={[styles.totalsTableLabel, isUsdOnly ? { width: '60%' } : {}]}>Subtotal</Text>
                <Text style={[styles.totalsTableCol, isUsdOnly ? { width: '40%' } : {}]}>${Number(invoice.subtotal_usd).toFixed(2)}</Text>
                {!isUsdOnly && <Text style={styles.totalsTableCol}>{Number(invoice.subtotal_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>}
              </View>

              {/* Fila IVA */}
              {isFactura && (
                <View style={styles.totalsTableRow}>
                  <Text style={[styles.totalsTableLabel, isUsdOnly ? { width: '60%' } : {}]}>I.V.A. (16%)</Text>
                  <Text style={[styles.totalsTableCol, isUsdOnly ? { width: '40%' } : {}]}>${Number(invoice.tax_amount_usd).toFixed(2)}</Text>
                  {!isUsdOnly && <Text style={styles.totalsTableCol}>{Number(invoice.tax_amount_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>}
                </View>
              )}

              {/* Fila IGTF */}
              <View style={styles.totalsTableRow}>
                <Text style={[styles.totalsTableLabel, isUsdOnly ? { width: '60%' } : {}]}>I.G.T.F. (3%)</Text>
                <Text style={[styles.totalsTableCol, isUsdOnly ? { width: '40%' } : {}]}>${Number(invoice.igtf_amount_usd || 0).toFixed(2)}</Text>
                {!isUsdOnly && <Text style={styles.totalsTableCol}>{(Number(invoice.igtf_amount_usd || 0) * currencyRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>}
              </View>

              {/* Fila Total */}
              <View style={styles.totalsTableTotalRow}>
                <Text style={[styles.totalsTableTotalLabel, isUsdOnly ? { width: '60%' } : {}]}>TOTAL FACTURA</Text>
                <Text style={[styles.totalsTableTotalValue, isUsdOnly ? { width: '40%' } : {}]}>${Number(invoice.total_usd).toFixed(2)}</Text>
                {!isUsdOnly && <Text style={styles.totalsTableTotalValue}>{Number(invoice.total_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>}
              </View>

              {/* Sección de Retenciones (si aplican) */}
              {!isUsdOnly && Number(invoice.retention_amount_bs) > 0 && (
                <>
                  <View style={[styles.totalsTableRow, { backgroundColor: '#fff7ed' }]}>
                    <Text style={[styles.totalsTableLabel, { color: '#c2410c' }]}>(-) RETENCIONES</Text>
                    <Text style={styles.totalsTableCol}>-</Text>
                    <Text style={[styles.totalsTableCol, { color: '#c2410c' }]}>{Number(invoice.retention_amount_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                  </View>
                  
                  <View style={[styles.totalsTableTotalRow, { backgroundColor: '#ecfdf5', borderTopWidth: 1, borderTopColor: '#059669' }]}>
                    <Text style={[styles.totalsTableTotalLabel, { color: '#059669' }]}>NETO A PAGAR</Text>
                    <Text style={[styles.totalsTableTotalValue, { color: '#059669' }]}>-</Text>
                    <Text style={[styles.totalsTableTotalValue, { color: '#059669' }]}>
                      {(Number(invoice.total_bs) - Number(invoice.retention_amount_bs)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* BLOQUE DE DESGLOSE DE RETENCIONES (Solo si aplica) */}
        {!isUsdOnly && Number(invoice.retention_amount_bs) > 0 && (
          <View style={[styles.bcvBlock, { marginTop: 10, borderColor: '#f97316', backgroundColor: '#fffaf5' }]}>
            <Text style={[styles.bcvTitle, { color: '#c2410c' }]}>Detalle de Retenciones Aplicadas (Cálculo Estimado)</Text>
            {Number(invoice.customer.porcent_retencion_iva) > 0 && (
              <View style={styles.bcvRow}>
                <Text style={styles.companyText}>Retención I.V.A. ({Number(invoice.customer.porcent_retencion_iva)}% del impuesto):</Text>
                <Text style={styles.companyText}>Bs. {(Number(invoice.tax_amount_bs) * Number(invoice.customer.porcent_retencion_iva) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}
            {Number(invoice.customer.porcent_retencion_islr) > 0 && (
              <View style={styles.bcvRow}>
                <Text style={styles.companyText}>Retención I.S.L.R. ({Number(invoice.customer.porcent_retencion_islr)}% de la base):</Text>
                <Text style={styles.companyText}>Bs. {(Number(invoice.subtotal_bs) * Number(invoice.customer.porcent_retencion_islr) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}
            {Number(invoice.customer.porcent_retencion_municipio) > 0 && (
              <View style={styles.bcvRow}>
                <Text style={styles.companyText}>Retención Municipal ({Number(invoice.customer.porcent_retencion_municipio)}%):</Text>
                <Text style={styles.companyText}>Bs. {(Number(invoice.subtotal_bs) * Number(invoice.customer.porcent_retencion_municipio) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}
          </View>
        )}

        {/* PIE DE PÁGINA */}
        <View style={styles.footer}>
          <Text>MassivaMovil ERP - MASSIVAMOVIL, C.A. {!isUsdOnly && '- J-40086828-9'}</Text>
          <Text>Documento generado electrónicamente. No requiere firma ni sello para su validez.</Text>
          <Text style={{ marginTop: 2 }}>Página 1 de 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
