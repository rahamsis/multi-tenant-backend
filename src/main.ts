import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import configureCors from './config/cors.config';
import swaggerConfig from './config/swagger.config';
import bodyConfig from './config/body.config';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

async function bootstrap() {
  // Crear la aplicación
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  //configuracion para que pueda leer cookies
  app.use(cookieParser());

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Llamar a la función para configurar CORS
  configureCors(app);

  // Llamar a la función para configurar el parser de body
  bodyConfig(app);

  // Llamar a la función para configurar Swagger
  swaggerConfig(app);

  // Iniciar la aplicación
  await app.listen(process.env.PORT!);
}
bootstrap();
