// ============================================================================
// INIT DE LA BASE DE DATOS PARA PRODUCCION (SEENODE / nube)
// ----------------------------------------------------------------------------
// Ejecuta los scripts SQL en el orden correcto contra la base de datos
// indicada en DATABASE_URL (variable de entorno o back-end/.env).
//
// Uso:
//   DATABASE_URL=postgres://... node back-end/db/init.js
//   o (desde la raiz): npm run db:init
//
// Es un script de INICIALIZACION (una sola vez). Si la BD ya tiene tablas,
// algunos scripts fallaran (por eso se crean con DROP/recrear en dev).
// ============================================================================

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carga las variables de back-end/.env (si existe).
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const ORDEN = [
  '00_SCHEMA.SQL',
  '02_AUDIT_TRIGGER.SQL',
  '01_PROCEDURES.SQL',
  '03_SEEDS.SQL',
  '05_USUARIOS_CRUD.SQL',
  '06_ORGANIZACION.SQL',
  '07_SP_EXTRA.SQL',
  '08_RESET_PASSWORD.SQL',
  '09_DOCUMENTOS.SQL',
  '10_FOTO_PERFIL.SQL',
  '11_RESERVAS.SQL',
  '12_SERVICIOS.SQL',
  '13_ACEPTAR_RESERVA.SQL',
  '14_VINCULAR_PASAJERO.SQL',
  '15_PUNTOS_RECOGIDA.SQL',
  '16_PROP_GRUPO.SQL',
  '17_BUSCAR_USUARIOS.SQL',
  '18_SEED_PERSONAL.SQL',
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL (variable de entorno o back-end/.env).');
    process.exit(1);
  }

  console.log('Conectando a la base de datos...');
  const client = new Client({ connectionString: url });
  await client.connect();

  for (const archivo of ORDEN) {
    const ruta = path.join(__dirname, archivo);
    const sql = fs.readFileSync(ruta, 'utf8');
    process.stdout.write(`Ejecutando ${archivo}... `);
    try {
      await client.query(sql);
      console.log('OK');
    } catch (error) {
      console.log('ERROR');
      console.error(`  ${error.message}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('\nBase de datos inicializada correctamente.');
}

main().catch((error) => {
  console.error('Error inesperado:', error);
  process.exit(1);
});