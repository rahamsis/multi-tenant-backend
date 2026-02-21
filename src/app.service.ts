import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { BodyDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Util } from './util/util';

@Injectable()
export class AppService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly util: Util
  ) { }

  async getMenus(tenant: string): Promise<any> {
    const menus = await this.databaseService.executeQuery(tenant, `
      SELECT 
        m.idMenu,
        m.urlMenu,
        m.titulo,
        m.idCategoria,
        m.userId, 
        m.estado,
        m.orden,
        GROUP_CONCAT(sc.subCategoria SEPARATOR ',') AS subMenu
      FROM menu m
      LEFT JOIN subcategorias sc ON m.idCategoria = sc.idCategoria
      GROUP BY 
        m.idMenu,
        m.urlMenu,
        m.titulo,
        m.idCategoria,
        m.userId, 
        m.estado,
        m.orden
      ORDER BY m.orden
      `, []);

    const categorias = await this.databaseService.executeQuery(tenant, `
      SELECT 
        c.idCategoria, 
        c.categoria, 
        c.activo,
        GROUP_CONCAT(sc.subCategoria SEPARATOR ',') AS subMenu
      FROM categorias c
      LEFT JOIN subcategorias sc on c.idCategoria = sc.idCategoria
      WHERE c.idCategoria NOT IN (SELECT idCategoria FROM menu)
      GROUP BY 
        c.idCategoria, 
        c.categoria, 
        c.activo
      ORDER BY c.categoria;
      `, []);

    return { menus, categorias };
  }

  async getNewProduct(tenant: string, feature: number): Promise<any> {
    const nuevosProductos = await this.databaseService.executeQuery(tenant, `
      SELECT 
        p.idProducto, 
        c.idCategoria,
        c.categoria,
        sc.idSubCategoria,
        sc.subCategoria,
        m.idMarca,
        m.marca, 
        p.nombre,
        p.precio,
        cl.idColor,
        cl.color,
        p.descripcion,
        p.destacado,
        p.nuevo, 
        p.masVendido, 
        p.activo, 
        GROUP_CONCAT(DISTINCT fp.url_foto ORDER BY fp.idFoto SEPARATOR ',') AS fotosAdicionales
      FROM productos p
      LEFT JOIN categorias c ON p.idCategoria = c.idCategoria
      LEFT JOIN subcategorias sc ON p.idSubCategoria = sc.idSubCategoria
      LEFT JOIN marcas m ON p.idMarca = m.idMarca
      LEFT JOIN colores cl ON p.idColor = cl.idColor
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

  async getAllProduct(tenant: string): Promise<any> {
    const nuevosProductos = await this.databaseService.executeQuery(tenant, `
      SELECT 
        p.idProducto, 
        c.idCategoria,
        c.categoria,
        sc.idSubCategoria,
        sc.subCategoria,
        m.idMarca,
        m.marca, 
        p.nombre,
        p.precio,
        cl.idColor,
        cl.color,
        p.descripcion,
        p.destacado,
        p.nuevo, 
        p.masVendido, 
        p.activo, 
        GROUP_CONCAT(DISTINCT fp.url_foto ORDER BY fp.idFoto SEPARATOR ',') AS fotosAdicionales
      FROM productos p
      LEFT JOIN categorias c ON p.idCategoria = c.idCategoria
      LEFT JOIN subcategorias sc ON p.idSubCategoria = sc.idSubCategoria
      LEFT JOIN marcas m ON p.idMarca = m.idMarca
      LEFT JOIN colores cl ON p.idColor = cl.idColor
      LEFT JOIN fotosproductos fp ON p.idProducto = fp.idProducto
      WHERE p.activo = 1 
      GROUP BY p.idProducto;`, []);

    return nuevosProductos || null;
  }

  async getAllBrands(tenant: string): Promise<any> {
    const nuevosProductos = await this.databaseService.executeQuery(tenant, `
      SELECT 
        m.idMarca,
        m.marca,
        m.urlFoto,
        m.activo
      FROM marcas m
      WHERE m.activo = 1;`, []);

    return nuevosProductos || null;
  }

  async getProductByCategory(tenant: string, category: string, subcategory: string | null): Promise<any> {
    const subcategoryParam = subcategory && subcategory.toLowerCase() !== "null" ? subcategory : null;
    const productos = await this.databaseService.executeQuery(tenant, `
      SELECT 
        p.idProducto, 
        c.idCategoria,
        c.categoria,
        sc.idSubCategoria,
        sc.subCategoria,
        m.idMarca,
        m.marca,
        p.nombre,
        p.precio,
        cl.idColor,
        cl.color,
        p.descripcion,
        p.destacado,
        p.nuevo, 
        p.masVendido, 
        p.activo, 
        GROUP_CONCAT(DISTINCT fp.url_foto ORDER BY fp.idFoto SEPARATOR ',') AS fotosAdicionales
      FROM productos p
      LEFT JOIN categorias c ON p.idCategoria = c.idCategoria
      LEFT JOIN subcategorias sc ON p.idSubCategoria = sc.idSubCategoria
      LEFT JOIN marcas m ON p.idMarca = m.idMarca
      LEFT JOIN colores cl ON p.idColor = cl.idColor
      LEFT JOIN fotosproductos fp ON p.idProducto = fp.idProducto
      WHERE LOWER(c.categoria) = LOWER(?) and p.activo = 1
      AND ( ? IS NULL OR LOWER(sc.subCategoria) = LOWER(?) )
      GROUP BY p.idProducto
      ORDER BY p.idProducto ASC;`, [category, subcategoryParam, subcategoryParam]);

    return productos || null;
  }

  async getAllBanners(tenant: string): Promise<any> {
    const banners = await this.databaseService.executeQuery(tenant, `
      SELECT 
        b.idBanner, 
        b.urlBanner, 
        b.posicion
      FROM banners b;`, []);

    return banners || null;
  }

  async login(tenant: string, body: BodyDto): Promise<any> {
    const user = await this.databaseService.executeQuery(
      tenant,
      `SELECT userId, nombre, apellidos, email, password, perfil, activo
      FROM users
      WHERE email = ?`,
      [body.email]
    );

    if (user.length === 0) {
      return { message: 'Correo inválido' };
    }

    if (!user[0].activo || user[0].activo === 0) {
      return { message: 'Usuario inactivo' };
    }

    const deviceInfo = await this.databaseService.executeQuery(
      tenant,
      `SELECT deviceId, userId, device, ipAdress FROM dispositivos WHERE userId = ? ORDER BY deviceId DESC LIMIT 1`,
      [user[0].userId]
    );

    if (deviceInfo.length > 0 && user[0].perfil !== 'admin') {
      return { message: 'ya existe un dispositivo afiliado, contacte con el administrador del sistema o escribanos por WhatsApp' };
    } else {
      // registramos el dispositivo
      const lastIdDevide = deviceInfo.length > 0 ? deviceInfo[0].deviceId : "DV0000";
      const deviceID = this.util.nextCode(lastIdDevide);
      await this.databaseService.executeQuery(
        tenant,
        `INSERT INTO dispositivos (deviceId, userId, device, ipAdress, created_at) VALUES (?, ?, ?, ?, ?)`,
        [deviceID, user[0].userId, body.device, body.ipAdress, new Date()]
      );
    }

    const passwordsMatch = await bcrypt.compare(body.password, user[0].password);
    if (!passwordsMatch) {
      return { message: 'Credenciales inválidas' };
    }

    const { password, ...userWithoutPassword } = user[0];

    return {
      user: userWithoutPassword
    };
  }
}
