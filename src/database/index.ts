import mongoose from 'mongoose';

export async function setupMongo() {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    if (!process.env.MONGO_URL) {
      throw new Error('🎲 Não foi possível conectar ao banco de dados');
    }

    console.log('🎲 Conectando ao banco de dados...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ banco de dados conectado com sucesso!');
  } catch {
    throw new Error('🎲 Erro ao conectar ao banco de dados');
  }
}
