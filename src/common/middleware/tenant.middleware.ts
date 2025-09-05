// tenant.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const host = req.headers.host || '';
    let tenantId: string | null = null;

    if (host.startsWith('admin.')) {
      tenantId = host.replace('admin.', '').split('.')[0];
    }

    // Si no hay tenant en host, buscar en headers
    if (!tenantId && req.headers['x-tenant-id']) {
      tenantId = String(req.headers['x-tenant-id']);
    }

    (req as any).tenantId = tenantId;
    next();
  }
}
