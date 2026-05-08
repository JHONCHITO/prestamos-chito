require("dotenv").config();

const mongoose = require("mongoose");
const OpenAI = require("openai");

// 🔥 IMPORT SEGURO DEL MODELO
let Cliente = require("../models/Cliente");

// 🔧 SI VIENE MAL EXPORTADO, LO ARREGLA
if (Cliente && Cliente.default) {
  Cliente = Cliente.default;
}

// 🔍 VALIDAR MODELO (CLAVE)
if (!Cliente || typeof Cliente.find !== "function") {
  console.error("❌ ERROR: Cliente no es un modelo válido de Mongoose");
  console.log("👉 Revisa src/models/Cliente.js");
  process.exit(1);
}

// 🔍 VALIDAR VARIABLES DE ENTORNO
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Falta OPENAI_API_KEY en .env");
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("❌ Falta MONGODB_URI en .env");
  process.exit(1);
}

// 🔥 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildClienteEmbeddingText(cliente = {}) {
  return `
Nombre: ${cliente.nombre || ''}
Cedula: ${cliente.cedula || ''}
Celular: ${cliente.celular || cliente.telefono || ''}
Direccion: ${cliente.direccion || ''}
Email: ${cliente.email || ''}
Tipo: ${cliente.tipoCliente || 'nuevo'}
Estado: ${cliente.estado || 'activo'}
`;
}

// 🔥 conexión Mongo
async function conectarDB() {
  try {
    if (mongoose.connection.readyState >= 1) return;

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB conectado (script)");
  } catch (error) {
    console.error("❌ Error conectando MongoDB:", error.message);
    process.exit(1);
  }
}

const BATCH_SIZE = 100;

async function generarEmbeddingsClientes() {
  try {
    console.log("🚀 Generando embeddings de clientes...");

    await conectarDB();

    let total = 0;

    while (true) {
      const clientes = await Cliente.find({
        $or: [
          { embedding: { $exists: false } },
          { embedding: null },
        ],
      }).limit(BATCH_SIZE);

      if (clientes.length === 0) {
        console.log("🎉 TODOS LOS CLIENTES PROCESADOS");
        break;
      }

      console.log(`📦 Procesando lote de ${clientes.length}`);

      for (const c of clientes) {
        try {
          if (!c.nombre) continue;

          const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: buildClienteEmbeddingText(c).trim(),
          });

          c.embedding = response.data[0].embedding;
          await c.save();

          total++;
          console.log(`✅ ${total} → ${c.nombre}`);

          await new Promise(res => setTimeout(res, 150));

        } catch (err) {
          console.error(`❌ Error en ${c.nombre}:`, err.message);
        }
      }
    }

    console.log("🔥 Embeddings completados");
    process.exit(0);

  } catch (error) {
    console.error("💣 ERROR GENERAL:", error);
    process.exit(1);
  }
}

generarEmbeddingsClientes();
