// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) { }

  async login(email: string, password: string, tenantId: string) {
    const user = await this.validateUser(email, password, tenantId);

    const payload = {
      sub: user.userId,
      email: user.email,
      tenant: tenantId,
    };

    return {
      user: {
        id: user.userId,
        email: user.email,
        name: user.nombre,
        perfil: user.perfil,
      },
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async validateUser(email: string, password: string, tenantId: string) {
    const users = await this.databaseService.executeQuery(
      tenantId,
      `SELECT userId, nombre, apellidos, email, password, perfil, activo 
      FROM users WHERE email = ? and perfil = 'admin' LIMIT 1`,
      [email],
    );

    if (!users || users.length === 0) {
      throw new Error('el correo ingresado no es valido');
    }

    const user = users[0];
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw new Error('Credenciales incorrectas');
    }

    return user;
  }
}
