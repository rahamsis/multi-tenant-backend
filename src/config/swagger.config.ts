import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Response, Request } from 'express';

export default (app: NestExpressApplication) => {

  // Configurar Swagger solo si no estamos en producción
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Microservicio Multi Tenant - ')
      .setDescription(
        `Este microservicio se encarga de administrar los endpoint's necesarios
         para el funcionamiento de los tenant`
      )
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        // Aseguramos que Swagger tome el prefijo global para las rutas
        url: `/backendApi/docs`
      }
    });
  }
};
