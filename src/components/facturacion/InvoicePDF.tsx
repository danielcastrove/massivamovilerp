import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Registrar fuentes (opcional, pero mejora la estética)
// Font.register({ family: 'Inter', src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#6d28d9',
    paddingBottom: 10,
  },
  logoSection: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6d28d9',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#0f172a',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoBlock: {
    width: '48%',
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 10,
    marginBottom: 4,
    color: '#1e293b',
  },
  table: {
    marginTop: 20,
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 8,
    alignItems: 'center',
  },
  colDesc: { width: '50%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  totalsTable: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#6d28d9',
    marginTop: 5,
    paddingTop: 5,
    fontWeight: 'bold',
    fontSize: 12,
    color: '#6d28d9',
  },
  exchangeRate: {
    marginTop: 20,
    fontSize: 8,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  retentionBadge: {
    marginTop: 5,
    padding: 5,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 3,
  },
  retentionText: {
    fontSize: 7,
    color: '#92400e',
  }
});

interface InvoicePDFProps {
  invoice: any;
}

const InvoicePDF = ({ invoice }: InvoicePDFProps) => {
  const isFactura = invoice.type === 'FACTURA';
  const currencyRate = Number(invoice.currency_rate);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>MASSIVAMOVIL</Text>
            <Text style={{ fontSize: 8, color: '#64748b' }}>RIF: J-12345678-9</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{isFactura ? 'FACTURA' : 'RECIBO'}</Text>
            <Text style={{ textAlign: 'right', fontSize: 10, color: '#64748b' }}>
              #{invoice.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Client & Invoice Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Información Fiscal (Empresa)</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>Razón Social: {invoice.customer.name}</Text>
            <Text style={styles.value}>RIF: {invoice.customer.doc_number}</Text>
            <Text style={styles.value}>Correo: {invoice.customer.email || 'N/A'}</Text>
            <Text style={styles.value}>Teléfono: {invoice.customer.telefono_empresa || 'N/A'}</Text>
            <Text style={styles.value}>Dirección: {invoice.customer.direccion_fiscal || 'N/A'}</Text>
            
            <Text style={[styles.label, { marginTop: 10 }]}>Persona de Contacto</Text>
            <Text style={styles.value}>
              Nombre: {(invoice.customer.persona_contacto_info as any)?.nombre || 
                       (invoice.customer.user ? `${invoice.customer.user.nombre || ''} ${invoice.customer.user.apellido || ''}`.trim() : 'N/A')}
            </Text>
            <Text style={styles.value}>
              Cargo: {(invoice.customer.persona_contacto_info as any)?.cargo || 'N/A'}
            </Text>
            {/* <Text style={styles.value}>
              Cédula: {(invoice.customer.persona_contacto_info as any)?.cedula || 'N/A'}
            </Text> */}
            <Text style={styles.value}>Correo: {(invoice.customer.persona_contacto_info as any)?.email || invoice.customer.user?.email || 'N/A'}</Text>
            <Text style={styles.value}>Teléfono: {(invoice.customer.persona_contacto_info as any)?.telefono || (invoice.customer.persona_contacto_info as any)?.telefono_celular || invoice.customer.user?.telefono_celular || 'N/A'}</Text>
          </View>
          <View style={[styles.infoBlock, { textAlign: 'right' }]}>
            <Text style={styles.label}>Fecha de Emisión</Text>
            <Text style={styles.value}>{new Date(invoice.issue_date).toLocaleDateString('es-VE')}</Text>
            <Text style={styles.label}>Fecha de Vencimiento</Text>
            <Text style={styles.value}>{new Date(invoice.due_date).toLocaleDateString('es-VE')}</Text>
            <Text style={styles.label}>Estado</Text>
            <Text style={[styles.value, { color: invoice.status === 'PAID' ? '#16a34a' : '#dc2626' }]}>
              {invoice.status}
            </Text>
          </View>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Descripción</Text>
          <Text style={styles.colQty}>Cant.</Text>
          <Text style={styles.colPrice}>Precio (USD)</Text>
          <Text style={styles.colTotal}>Total (USD)</Text>
        </View>

        {/* Table Rows */}
        {(invoice.invoice_items || []).map((item: any, index: number) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.product?.name || 'Servicio'}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>${Number(item.unit_price_usd).toFixed(2)}</Text>
            <Text style={styles.colTotal}>${Number(item.total_usd).toFixed(2)}</Text>
          </View>
        ))}

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text>Subtotal USD:</Text>
              <Text>${Number(invoice.subtotal_usd).toFixed(2)}</Text>
            </View>
            
            {isFactura && (
              <View style={styles.totalRow}>
                <Text>IVA (16%) USD:</Text>
                <Text>${Number(invoice.tax_amount_usd).toFixed(2)}</Text>
              </View>
            )}

            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text>TOTAL USD:</Text>
              <Text>${Number(invoice.total_usd).toFixed(2)}</Text>
            </View>

            <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 }}>
              <View style={styles.totalRow}>
                <Text style={{ fontSize: 9 }}>Total en Bolívares:</Text>
                <Text style={{ fontSize: 9 }}>Bs. {Number(invoice.total_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
              </View>

              {Number(invoice.retention_amount_bs) > 0 && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={{ fontSize: 9, color: '#dc2626' }}>Retenciones Bs:</Text>
                    <Text style={{ fontSize: 9, color: '#dc2626' }}>- Bs. {Number(invoice.retention_amount_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                  </View>
                  <View style={[styles.totalRow, { marginTop: 5, borderTopWidth: 1, borderTopColor: '#6d28d9', paddingTop: 5 }]}>
                    <Text style={{ fontWeight: 'bold', fontSize: 10 }}>NETO A PAGAR BS:</Text>
                    <Text style={{ fontWeight: 'bold', fontSize: 10 }}>Bs. {(Number(invoice.total_bs) - Number(invoice.retention_amount_bs)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Exchange Rate Info */}
        <Text style={styles.exchangeRate}>
          Tasa de cambio BCV aplicada: Bs. {currencyRate.toFixed(4)} (Fecha valor: {new Date(invoice.issue_date).toLocaleDateString('es-VE')})
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>MassivaMovil ERP - Automatización de Cobranza Omnicanal</Text>
          <Text>Este documento es una representación digital de la transacción.</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
