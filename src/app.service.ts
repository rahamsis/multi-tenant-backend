import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) { }

  async getNewProduct(tenant: string, feature: number): Promise<any> {
    const nuevosProductos = await this.databaseService.executeQuery(tenant,`
      SELECT 
        p.idProducto, 
        p.categoria,
        p.subCategoria,
        p.marca, 
        p.nombre,
        p.precio,
        p.color,
        p.descripcion, 
        p.imagen,
        p.destacado,
        p.nuevo, 
        p.masVendido, 
        p.activo, 
        GROUP_CONCAT(DISTINCT fp.url_foto ORDER BY fp.idFoto SEPARATOR ',') AS fotosAdicionales
      FROM productos p
      LEFT JOIN fotosproductos fp ON p.idProducto = fp.idProducto
      WHERE p.activo = 1 
      AND ( 
        ? = 1 and p.destacado = 1
        OR ? = 2 and p.nuevo = 1
        OR ? = 3 and p.masVendido = 1)
      GROUP BY p.idProducto
      ORDER BY RAND()
      LIMIT 8;`, [feature, feature, feature]);

    return nuevosProductos || null;
  }

  async getProductByCategory(tenant: string, category: string): Promise<any> {
    const productos = await this.databaseService.executeQuery(tenant,`
      SELECT 
        p.idProducto, 
        p.categoria,
        p.subCategoria,
        p.marca, 
        p.nombre,
        p.precio,
        p.color,
        p.descripcion, 
        p.imagen,
        p.destacado,
        p.nuevo, 
        p.masVendido, 
        p.activo, 
        GROUP_CONCAT(DISTINCT fp.url_foto ORDER BY fp.idFoto SEPARATOR ',') AS fotosAdicionales
      FROM productos p
      LEFT JOIN fotosproductos fp ON p.idProducto = fp.idProducto
      WHERE LOWER(categoria) = LOWER(?) and p.activo = 1
      GROUP BY p.idProducto
      ORDER BY p.idProducto ASC;`, [category]);

    return productos || null;
  }
}
