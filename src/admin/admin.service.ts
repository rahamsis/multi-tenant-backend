import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { DatabaseService } from 'src/database/database.service';
import { ProductDto } from 'src/dto/admin.dto';
import { Readable } from 'stream';

@Injectable()
export class AdminService {
  constructor(private readonly databaseService: DatabaseService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
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
          p.imagen,
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
        GROUP BY p.idProducto
        ORDER BY p.idProducto;`,);

    return nuevosProductos || null;
  }

  async getAllCategories(tenant: string): Promise<any> {
    const categories = await this.databaseService.executeQuery(tenant, `
      SELECT idCategoria, categoria FROM categorias;`);

    return categories || null;
  }

  async getAllSubCategories(tenant: string): Promise<any> {
    const subCategories = await this.databaseService.executeQuery(tenant, `
      SELECT idSubCategoria, subCategoria FROM subcategorias;`);

    return subCategories || null;
  }

  async getAllBrands(tenant: string): Promise<any> {
    const brands = await this.databaseService.executeQuery(tenant, `
      SELECT idMarca, marca FROM marcas;`);

    return brands || null;
  }

  async getAllColors(tenant: string): Promise<any> {
    const colors = await this.databaseService.executeQuery(tenant, `
      SELECT idMarca, marca FROM marcas;`);

    return colors || null;
  }

  async updateStatus(tenant: string, body: { idProduct: number, status: number }): Promise<any> {
    const updateProduct = await this.databaseService.executeQuery(tenant, `
        UPDATE productos SET activo = ? WHERE idProducto = ?
        `, [body.status, body.idProduct])

    return updateProduct || null;
  }

  async saveProduct(tenant: string, files: Express.Multer.File[], folder = 'default', producto: ProductDto): Promise<any> {
    // Subir imágenes
    const uploads = await Promise.all(
      files.map((file) => this.uploadToCloudinary(file)),
    );

    // Aquí ya tienes las URLs de Cloudinary
    const imageUrls = uploads.map((u) => u.secure_url);

    // TODO: Guardar en la base de datos
    // Ejemplo de objeto a guardar:
    const product = {
      name: producto.nombre,
      price: producto.precio,
      categoria: producto.categoria,
      images: imageUrls,
    };

    console.log('Producto guardado:', product);

    return {
      message: 'Producto creado exitosamente',
      product,
    };
  }

  private uploadToCloudinary(file: Express.Multer.File): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'productos' }, // 👈 carpeta destino
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}
