import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'body-parser';

export default (app: NestExpressApplication) => {
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
};
