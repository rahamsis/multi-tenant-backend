// // tenant-auth.guard.ts
// import {
//   CanActivate,
//   ExecutionContext,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';

// @Injectable()
// export class TenantAuthGuard implements CanActivate {
//   constructor(private jwtService: JwtService) {}

//   canActivate(context: ExecutionContext): boolean {
//     const request = context.switchToHttp().getRequest();

//     const authHeader = request.headers['authorization'];
//     if (!authHeader) throw new UnauthorizedException('Missing token');

//     const token = authHeader.split(' ')[1];
//     const payload = this.jwtService.verify(token);

//     const tenantFromToken = payload.tenantId;
//     const tenantFromRequest = (request as any).tenantId;

//     if (tenantFromRequest !== tenantFromToken) {
//       throw new UnauthorizedException('Tenant mismatch');
//     }

//     request.user = payload;
//     return true;
//   }
// }
