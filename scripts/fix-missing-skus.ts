
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });

async function main() {
  console.log('Conectando a la base de datos para actualización SQL...');
  
  try {
    // 1. Obtener los productos que no tienen SKU (o tienen SKU nulo)
    const res = await pool.query('SELECT id, name FROM "Product" WHERE sku IS NULL');
    const products = res.rows;

    console.log(`Encontrados ${products.length} productos para actualizar.`);

    for (const product of products) {
      const generatedSku = `OLD-PROD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      // 2. Actualizar usando SQL puro
      await pool.query('UPDATE "Product" SET sku = $1 WHERE id = $2', [generatedSku, product.id]);
      
      console.log(`Producto "${product.name}" actualizado con SKU: ${generatedSku}`);
    }

    console.log('¡Éxito! Todos los productos tienen SKU ahora.');
  } catch (err) {
    console.error('Error durante la actualización SQL:', err);
  } finally {
    await pool.end();
  }
}

main();
