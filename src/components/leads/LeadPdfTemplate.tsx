import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Lead } from './LeadsPageClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#6D28D9',
    paddingBottom: 10,
  },
  logoSection: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    color: '#6D28D9',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#F3F4F6',
    padding: 6,
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
    width: 120,
  },
  value: {
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold',
    flex: 1,
  },
  badge: {
    fontSize: 9,
    padding: '2 6',
    borderRadius: 4,
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  commentBox: {
    marginTop: 5,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentText: {
    fontSize: 9,
    color: '#4B5563',
    lineHeight: 1.4,
  }
});

interface LeadPdfTemplateProps {
  lead: Lead;
}

export const LeadPdfTemplate: React.FC<LeadPdfTemplateProps> = ({ lead }) => {
  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), "dd 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.title}>MASSIVAMOVIL</Text>
            <Text style={styles.subtitle}>Reporte de Prospecto (Lead)</Text>
          </View>
          <View>
            <Text style={styles.subtitle}>Generado el: {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
            <Text style={styles.subtitle}>ID: {lead.id.substring(0, 8)}</Text>
          </View>
        </View>

        {/* Información Personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Contacto</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre Completo:</Text>
            <Text style={styles.value}>{lead.nombre} {lead.apellido}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cédula / RIF:</Text>
            <Text style={styles.value}>{lead.cedula || 'No especificado'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{lead.email || 'No especificado'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Teléfono:</Text>
            <Text style={styles.value}>{lead.telefono || 'No especificado'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo de Lead:</Text>
            <Text style={[styles.value, lead.tipo_lead === 'VIP' ? { color: '#B45309' } : {}]}>
              {lead.tipo_lead}
            </Text>
          </View>
        </View>

        {/* Interés Comercial */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interés Comercial</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Producto:</Text>
            <Text style={styles.value}>{lead.product?.name || lead.custom_product || 'No especificado'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Lista de Precios:</Text>
            <Text style={styles.value}>{lead.priceList?.name || 'Por defecto'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Procedencia:</Text>
            <Text style={styles.value}>{lead.procedencia.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Gestión y Estado */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestión y Seguimiento</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Estado Actual:</Text>
            <Text style={styles.value}>{lead.status.replace('_', ' ')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de Registro:</Text>
            <Text style={styles.value}>{safeFormatDate(lead.fecha_contacto)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de Llamada:</Text>
            <Text style={styles.value}>{safeFormatDate(lead.fecha_llamada)}</Text>
          </View>
        </View>

        {/* Comentarios */}
        {lead.comentarios && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones / Notas</Text>
            <View style={styles.commentBox}>
              <Text style={styles.commentText}>{lead.comentarios}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          © {new Date().getFullYear()} MassivaMovil ERP - Sistema de Gestión de Cobranza y CRM
        </Text>
      </Page>
    </Document>
  );
};
