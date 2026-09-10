import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Falta la variable de entorno MONGODB_URI.");
}

/**
 * Cache de la conexión entre recargas en dev (hot reload) y entre invocaciones
 * de funciones serverless en producción.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  _mongoose?: MongooseCache;
};

const cached: MongooseCache =
  globalForMongoose._mongoose ?? { conn: null, promise: null };

globalForMongoose._mongoose = cached;

const CONNECT_OPTS: mongoose.ConnectOptions = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 8000,
};

export async function connectToDatabase(): Promise<typeof mongoose> {
  // readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Si quedó a medio camino de un intento fallido, reseteá antes de reintentar.
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }
    cached.promise = mongoose.connect(MONGODB_URI!, CONNECT_OPTS);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    // Re-lanzar un Error plano: el original es una instancia de clase de
    // mongoose que no se puede serializar hacia el cliente.
    throw new Error(
      `No se pudo conectar a MongoDB. ${(error as Error).message}`,
    );
  }

  return cached.conn;
}
