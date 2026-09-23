// massivamovilerp/src/components/customers/CustomerDetailsPDF.tsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { Customer } from "./CustomerPageClient";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2pt solid #0891b2',
    paddingBottom: 15,
    marginBottom: 20,
  },
  logo: {
    width: 140,
  },
  headerInfo: {
    textAlign: 'right',
  },
  customerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  customerSub: {
    fontSize: 10,
    color: '#64748b',
  },
  statusBadge: {
    marginTop: 8,
    padding: '4 8',
    backgroundColor: '#f0fdfa',
    color: '#166534',
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 60,
    alignSelf: 'flex-end',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0891b2',
    backgroundColor: '#f8fafc',
    padding: '6 10',
    borderLeft: '4pt solid #0891b2',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  col: {
    width: '47%',
  },
  field: {
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#1e293b',
  },
  contactBox: {
    width: '100%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    border: '1pt solid #e2e8f0',
    marginBottom: 15,
  },
  contactHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0891b2',
    marginBottom: 10,
    borderBottom: '1pt solid #cbd5e1',
    paddingBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTop: '1pt solid #e2e8f0',
    paddingTop: 10,
  }
});

interface CustomerDetailsPDFProps {
  customer: Customer;
  serviciosResueltos: { listName: string, serviceName: string, priceUsd: number | null, priceBs: number | null }[];
}

const CustomerDetailsPDF = ({ customer, serviciosResueltos }: CustomerDetailsPDFProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://massivamovilerp.vercel.app';
  
  const DetailField = ({ label, value }: { label: string; value?: string | number | null }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "N/A"}</Text>
    </View>
  );

  const CommonHeader = () => (
    <View style={styles.header}>
      <Image src={`${baseUrl}/massivamovil.png`} style={styles.logo} />
      <View style={styles.headerInfo}>
        <Text style={styles.customerTitle}>{customer.name}</Text>
        <Text style={styles.customerSub}>RIF/CI: {customer.doc_number}</Text>
        <View style={styles.statusBadge}>
          <Text>{customer.status === 'ACTIVE' ? 'ACTIVO' : customer.status}</Text>
        </View>
      </View>
    </View>
  );

  const CommonFooter = ({ pageNum, totalPages }: { pageNum: number, totalPages: number }) => (
    <View style={styles.footer}>
      <Text>MassivaMovil ERP - Documento Informativo del Cliente - Página {pageNum} de {totalPages}</Text>
    </View>
  );

  return (
    <Document>
      {/* PÁGINA 1: GENERAL (Pestaña General) */}
      <Page size="A4" style={styles.page}>
        <CommonHeader />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pestaña 1: Información General y Ubicación</Text>
          <View style={styles.grid}>
            <View style={styles.col}>
              <DetailField label="Razón Social" value={customer.name} />
              <DetailField label="Email Principal" value={customer.email} />
              <DetailField label="Teléfono Empresa" value={customer.telefono_empresa} />
              <DetailField label="Celular" value={customer.telefono_celular} />
              <DetailField label="Sitio Web" value={customer.sitio_web} />
            </View>
            <View style={styles.col}>
              <DetailField label="Dirección Fiscal" value={customer.direccion_fiscal} />
              <DetailField label="Ciudad" value={customer.ciudad} />
              <DetailField label="Estado" value={customer.estado} />
              <DetailField label="País" value={customer.pais} />
              <DetailField label="Código Postal" value={customer.codigo_postal} />
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perfil de Empresa</Text>
          <View style={styles.grid}>
            <View style={{ width: '31%' }}><DetailField label="Tipo Cliente" value={customer.type} /></View>
            <View style={{ width: '31%' }}><DetailField label="Tipo Empresa" value={customer.tipo_empresa} /></View>
            <View style={{ width: '31%' }}><DetailField label="Figura Legal" value={customer.figura_legal?.replace(/_/g, ' ')} /></View>
            <View style={{ width: '31%' }}><DetailField label="Tipo Venta" value={customer.tipo_venta} /></View>
            <View style={{ width: '31%' }}><DetailField label="Usuario SMS" value={customer.email_user_masiva_SMS} /></View>
            <View style={{ width: '31%' }}><DetailField label="Usuario WhatsApp" value={customer.email_user_masiva_whatsapp} /></View>
          </View>
        </View>
        <CommonFooter pageNum={1} totalPages={4} />
      </Page>

      {/* PÁGINA 2: CONTACTOS (Pestaña Contactos) */}
      <Page size="A4" style={styles.page}>
        <CommonHeader />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pestaña 2: Personal de Contacto y Cobranza</Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactHeader}>Persona de Contacto Principal</Text>
            <View style={styles.grid}>
                <View style={styles.col}><DetailField label="Nombre" value={customer.persona_contacto_info?.nombre} /></View>
                <View style={styles.col}><DetailField label="Cargo" value={customer.persona_contacto_info?.cargo} /></View>
                <View style={styles.col}><DetailField label="Email" value={customer.persona_contacto_info?.email} /></View>
                <View style={styles.col}><DetailField label="Teléfono" value={customer.persona_contacto_info?.telefono} /></View>
            </View>
          </View>
          <View style={styles.contactBox}>
            <Text style={styles.contactHeader}>Persona de Cobranza / Pagos</Text>
            <View style={styles.grid}>
                <View style={styles.col}><DetailField label="Nombre" value={customer.persona_cobranza_info?.nombre} /></View>
                <View style={styles.col}><DetailField label="Cargo" value={customer.persona_cobranza_info?.cargo} /></View>
                <View style={styles.col}><DetailField label="Email" value={customer.persona_cobranza_info?.email} /></View>
                <View style={styles.col}><DetailField label="Teléfono" value={customer.persona_cobranza_info?.telefono} /></View>
            </View>
          </View>
        </View>
        <CommonFooter pageNum={2} totalPages={4} />
      </Page>

      {/* PÁGINA 3: LEGAL (Pestaña Legal/Reg.) */}
      <Page size="A4" style={styles.page}>
        <CommonHeader />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pestaña 3: Registro Mercantil y Representante</Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactHeader}>Datos del Registro</Text>
            <View style={styles.grid}>
                <View style={styles.col}><DetailField label="Nombre Registro" value={customer.documento_constitutivo_info?.nombre_registro} /></View>
                <View style={styles.col}><DetailField label="Fecha Registro" value={customer.documento_constitutivo_info?.fecha_registro} /></View>
                <View style={styles.col}><DetailField label="Número / Tomo" value={customer.documento_constitutivo_info?.nro_tomo} /></View>
                <View style={styles.col}><DetailField label="Email Registro" value={customer.documento_constitutivo_info?.email_registro} /></View>
            </View>
          </View>
          <View style={styles.contactBox}>
            <Text style={styles.contactHeader}>Representante Legal</Text>
            <View style={styles.grid}>
                <View style={styles.col}><DetailField label="Nombre Completo" value={customer.representante_legal_info?.nombre} /></View>
                <View style={styles.col}><DetailField label="Cédula" value={`${customer.representante_legal_info?.cedulaPrefix}-${customer.representante_legal_info?.cedulaNumber}`} /></View>
                <View style={styles.col}><DetailField label="Cargo" value={customer.representante_legal_info?.cargo} /></View>
                <View style={styles.col}><DetailField label="Email" value={customer.representante_legal_info?.email} /></View>
            </View>
          </View>
        </View>
        <CommonFooter pageNum={3} totalPages={4} />
      </Page>

      {/* PÁGINA 4: FISCAL (Pestaña Fiscal/Susc.) */}
      <Page size="A4" style={styles.page}>
        <CommonHeader />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pestaña 4: Datos Fiscales y Suscripción</Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactHeader}>Configuración Fiscal</Text>
            <View style={styles.grid}>
                <View style={{ width: '31%' }}><DetailField label="Contribuyente" value={customer.settings?.taxType === 'SPECIAL' ? 'Especial' : 'Ordinario'} /></View>
                <View style={{ width: '31%' }}><DetailField label="Agente Ret." value={customer.is_agente_retencion ? "Sí" : "No"} /></View>
                <View style={{ width: '31%' }}><DetailField label="Exento IVA" value={customer.settings?.isTaxExempt ? "Sí" : "No"} /></View>
                <View style={{ width: '31%' }}><DetailField label="Retención IVA" value={`${customer.porcent_retencion_iva || 0}%`} /></View>
                <View style={{ width: '31%' }}><DetailField label="Retención ISLR" value={`${customer.porcent_retencion_islr || 0}%`} /></View>
                <View style={{ width: '31%' }}><DetailField label="Retención Mun." value={`${customer.porcent_retencion_municipio || 0}%`} /></View>
            </View>
          </View>
          <View style={styles.contactBox}>
            <Text style={styles.contactHeader}>Servicios y Tarifas Contratadas</Text>
            {serviciosResueltos && serviciosResueltos.length > 0 ? (
              serviciosResueltos.map((r, index) => (
                <View key={index} style={{ marginBottom: 8, paddingBottom: 5, borderBottom: '0.5pt solid #e2e8f0' }}>
                  <Text style={[styles.label, { marginBottom: 2 }]}>{r.listName}</Text>
                  <Text style={styles.value}>{r.serviceName}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                    {r.priceUsd != null && <Text style={[styles.value, { fontWeight: 'bold' }]}>USD: ${r.priceUsd.toFixed(2)}</Text>}
                    {r.priceBs != null && <Text style={[styles.value, { fontWeight: 'bold' }]}>Bs: {r.priceBs.toFixed(2)}</Text>}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.value}>No hay servicios contratados.</Text>
            )}
          </View>
        </View>
        <CommonFooter pageNum={4} totalPages={4} />
      </Page>
    </Document>
  );
};

export default CustomerDetailsPDF;
