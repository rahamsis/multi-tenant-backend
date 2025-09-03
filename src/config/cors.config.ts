import { NestExpressApplication } from '@nestjs/platform-express';

export default (app: NestExpressApplication) => {
  // Configurar CORS basado en variables de entorno
  const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*', // Usa el valor de CORS_ORIGIN o permite todos en caso de no estar definido
    // origin: ['http://localhost:5000', 'https://importonyperu.com.pe'],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
    credentials: true
  };

  app.enableCors(corsOptions);
};
