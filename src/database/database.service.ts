import { Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService {
  private pools: Record<string, mysql.Pool> = {};

  private getEnvVar(tenant: string, key: string): string {
    const varName = `MYSQL_${tenant.toUpperCase()}_${key.toUpperCase()}`;
    const value = process.env[varName];
    if (value === undefined) throw new Error(`Variable ${varName} no encontrada en .env`);
    return value ;
  }

  private async getPool(tenant: string): Promise<mysql.Pool> {
    // Si ya existe, reutilizamos el pool
    if (this.pools[tenant]) return this.pools[tenant];

    // Creamos el pool la primera vez que se llama este tenant
    const pool = mysql.createPool({
      host: this.getEnvVar(tenant, 'HOST'),
      user: this.getEnvVar(tenant, 'USER'),
      password: this.getEnvVar(tenant, 'PASSWORD'),
      database: this.getEnvVar(tenant, 'DATABASE'),
      port: Number(this.getEnvVar(tenant, 'PORT')),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    this.pools[tenant] = pool;
    return pool;
  }

  async executeQuery(tenant: string, query: string, params: any[] = []): Promise<any> {
    try {
      const pool = await this.getPool(tenant);
      const [results] = await pool.execute(query, params);
      return results;
    } catch (error) {
      throw new Error(`Error ejecutando la consulta en ${tenant}: ${error.message}`);
    }
  }
}
