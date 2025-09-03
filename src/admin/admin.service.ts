import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class AdminService {
    constructor(private readonly databaseService: DatabaseService) { }

    async getAllProduct(tenant: string): Promise<any> {
        const nuevosProductos = await this.databaseService.executeQuery(tenant, `
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
        GROUP BY p.idProducto
        ORDER BY p.idProducto;`,);

        return nuevosProductos || null;
    }
}
