// scripts/test-pg-connection.ts
import 'dotenv/config';
import { Pool } from 'pg';

async function testPgConnection() {
  console.log('--- Iniciando prueba de conexión directa con `pg` ---');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: La variable de entorno DATABASE_URL no está definida.');
    return;
  }

  console.log('Intentando conectar con la URL (contraseña oculta):', connectionString.replace(/:[^:]+@/, ':****@'));

  const pool = new Pool({
    connectionString,
    // Tiempos de espera cortos para fallar rápido si no hay conexión
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ ¡Éxito! Conexión establecida con `pg`.');
    
    const res = await client.query('SELECT NOW() as now');
    console.log('Resultado de la consulta:', res.rows[0]);
    
    client.release();
    console.log('Cliente liberado.');
  } catch (error) {
    console.error('❌ Falló la conexión con `pg`.');
    console.error('Este error viene directamente de la librería de PostgreSQL, no de Prisma.');
    console.error('Esto confirma que el problema es la URL de conexión o un bloqueo de red/firewall.');
    console.error(error);
  } finally {
    await pool.end();
    console.log('Pool de conexiones cerrado.');
  }
}

testPgConnection();
