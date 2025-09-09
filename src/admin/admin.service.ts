import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { DatabaseService } from 'src/database/database.service';
import { CategorieDto, ColorDto, MarcaDto, NewProductDto, ProductDto, SubCategorieDto } from 'src/dto/admin.dto';
import { nextCode } from 'src/util/util';
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
          p.cantidad,
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
      SELECT idColor, color FROM colores;`);

    return colors || null;
  }

  async updateStatus(tenant: string, body: { idProduct: number, status: number }): Promise<any> {
    const updateProduct = await this.databaseService.executeQuery(tenant, `
        UPDATE productos SET activo = ? WHERE idProducto = ?
        `, [body.status, body.idProduct])

    return updateProduct || null;
  }

  async saveProduct(tenant: string, files: Express.Multer.File[], body: NewProductDto): Promise<any> {
    let categoria = "";
    let subcategoria = "";

    // Obtiene cataegoria para adjuntarlo en la ruta
    if (body?.idCategoria && body.idCategoria.trim() !== "") {
      const result = await this.databaseService.executeQuery(
        tenant,
        `SELECT categoria FROM categorias WHERE idCategoria = ?`,
        [body.idCategoria]
      );
      categoria = result.length > 0 ? result[0].categoria : "";
    }

    // Obtiene la subcategoria para adjuntarlo en la ruta
    if (body?.idSubCategoria && body.idSubCategoria.trim() !== "") {
      const result = await this.databaseService.executeQuery(
        tenant,
        `SELECT subCategoria FROM subcategorias WHERE idSubCategoria = ?`,
        [body.idSubCategoria]
      );
      subcategoria = result.length > 0 ? result[0].subCategoria : "";
    }

    const parts = [tenant, categoria, subcategoria].filter(Boolean);
    const folder = parts.join("/");

    const rows = await this.databaseService.executeQuery(tenant, `
      SELECT idProducto FROM productos ORDER BY idProducto DESC limit 1;`, []);
    const lastIdProducto = rows.length > 0 ? rows[0].idProducto : "PROD0000";
    const idProducto = nextCode(lastIdProducto);

    let mainImageUrl: string | null = null;
    if (files && files.length > 0) {
      // ✅ Primera imagen con idProducto
      const firstFile = files[0];
      const uploadMain = await this.uploadToCloudinary(
        firstFile,
        idProducto,
        folder
      );

      mainImageUrl = uploadMain.secure_url;

      // ✅ Otras imágenes → tabla fotos
      const otherFiles = files.slice(1);
      for (const file of otherFiles) {
        const rows = await this.databaseService.executeQuery(tenant, `
          SELECT idFoto FROM fotosproductos ORDER BY idFoto DESC limit 1;`, []);
        const lastIdFoto = rows.length > 0 ? rows[0].idFoto : "FPRD0000";
        const idFoto = nextCode(lastIdFoto);

        const nextOrden = rows[0].maxOrden + 1;

        // 1. Insertar registro en fotos y obtener idFoto
        const fotoResult = await this.databaseService.executeQuery(
          tenant,
          `INSERT INTO fotosproductos (idFoto, idProducto, orden, userId, created_at, updated_at) 
          VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [idFoto, idProducto, nextOrden, body.userId]
        );

        // 2. Subir a Cloudinary usando idFoto
        const upload = await this.uploadToCloudinary(
          file,
          idFoto,
          folder
        );

        // 3. Actualizar URL en tabla fotos
        await this.databaseService.executeQuery(
          tenant,
          `UPDATE fotosproductos SET url_foto = ? WHERE idFoto = ?`,
          [upload.secure_url, idFoto]
        );
      }
    }

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO productos (idProducto, idCategoria, idSubCategoria, idMarca, nombre, precio, idColor, 
      descripcion, imagen, destacado, nuevo, masVendido, activo, userId, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());`,
      [
        idProducto,
        body.idCategoria,
        body.idSubCategoria,
        body.idMarca,
        body.nombre,
        body.precio,
        body.idColor,
        body.descripcion,
        mainImageUrl,
        body.destacado,
        body.nuevo,
        body.masVendido,
        body.activo ? 1 : 0,
        body.userId]);

    return {
      message: 'Producto creado exitosamente',
      result,
    };
  }

  async updateProduct(tenant: string, files: Express.Multer.File[], body: NewProductDto): Promise<any> {
    let categoria = "";
    let subcategoria = "";

    // Obtiene cataegoria para adjuntarlo en la ruta
    if (body?.idCategoria && body.idCategoria.trim() !== "") {
      const result = await this.databaseService.executeQuery(
        tenant,
        `SELECT categoria FROM categorias WHERE idCategoria = ?`,
        [body.idCategoria]
      );
      categoria = result.length > 0 ? result[0].categoria : "";
    }

    // Obtiene la subcategoria para adjuntarlo en la ruta
    if (body?.idSubCategoria && body.idSubCategoria.trim() !== "") {
      const result = await this.databaseService.executeQuery(
        tenant,
        `SELECT subCategoria FROM subcategorias WHERE idSubCategoria = ?`,
        [body.idSubCategoria]
      );
      subcategoria = result.length > 0 ? result[0].subCategoria : "";
    }

    const parts = [tenant, categoria, subcategoria].filter(Boolean);
    const folder = parts.join("/");

    if (body?.idProducto) {
      const products = await this.databaseService.executeQuery(tenant, `
      SELECT idProducto FROM productos WHERE idProducto = ?;`, [body.idProducto]);

      if (products.length > 0) {
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        // Recorremos cada propiedad del objeto body
        Object.keys(body).forEach((key) => {
          const value = body[key as keyof NewProductDto];

          // Si el valor no es nulo, vacío o indefinido, lo agregamos a la consulta
          if (value !== null && value !== undefined && value !== "") {
            // Omitimos el campo imagen
            if (key === "imagen") return;
            updateFields.push(`${key} = ?`);
            updateValues.push(value);
          }
        });

        // 🚀 Manejo de imágenes en caso de update
        if (files && files.length > 0) {
          const folderParts = [tenant];
          const folder = folderParts.join("/");

          // ✅ Primera imagen: reemplazar la principal del producto
          const firstFile = files[0];
          const uploadMain = await this.uploadToCloudinary(
            firstFile,
            body.idProducto, // mantener mismo public_id del producto
            folder
          );

          // Actualizamos campo imagen en la tabla productos
          updateFields.push("imagen = ?");
          updateValues.push(uploadMain.secure_url);

          // ✅ Otras imágenes → se insertan en fotos
          const otherFiles = files.slice(1);
          for (const file of otherFiles) {
            const rows = await this.databaseService.executeQuery(tenant, `
              SELECT idFoto FROM fotosproductos ORDER BY idFoto DESC limit 1;`, []);
            const lastIdFoto = rows.length > 0 ? rows[0].idFoto : "FPRD0000";
            const idFoto = nextCode(lastIdFoto);

            const nextOrden = rows[0].maxOrden + 1;

            const fotoResult = await this.databaseService.executeQuery(
              tenant,
              `INSERT INTO fotosproductos (idFoto, idProducto, orden, userId, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
              [idFoto, body.idProducto, nextOrden, body.userId]
            );

            const upload = await this.uploadToCloudinary(
              file,
              idFoto,
              folder
            );

            await this.databaseService.executeQuery(
              tenant,
              `UPDATE fotosproductos SET url_foto = ? WHERE idFoto = ?`,
              [upload.secure_url, idFoto]
            );
          }
        }

        // Siempre actualizamos la fecha
        updateFields.push("updated_at = NOW()");

        // Agregamos el ID del usuario al final
        updateValues.push(body.idProducto);

        // Construimos la consulta dinámica
        const sql = `
          UPDATE productos 
          SET ${updateFields.join(", ")} 
          WHERE idProducto = ?`;

        const result = await this.databaseService.executeQuery(tenant, sql, updateValues);

        return {
          message: 'Categoria actualizada exitosamente',
          result,
        };
      }
    }
  }

  private uploadToCloudinary(file: Express.Multer.File, id: string, folder: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: id,       // 👈 nombre único para la imagen
          overwrite: true,     // 👈 reemplaza si ya existe
          invalidate: true     // 👈 limpia caché CDN de Cloudinary
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async saveOrUpdateCategorie(tenant: string, body: CategorieDto): Promise<any> {

    if (body.idCategoria) {
      const categories = await this.databaseService.executeQuery(tenant, `
      SELECT idCategoria FROM categorias WHERE idCategoria = ?;`, [body.idCategoria]);

      if (categories.length > 0) {
        const result = await this.databaseService.executeQuery(tenant, `
      UPDATE categorias SET categoria = ?, SET updated_at = NOW() WHERE idCategoria = ?;`,
          [body.categoria, body.idCategoria]);

        return {
          message: 'Categoria actualizada exitosamente',
          result,
        };
      }
    }

    const rows = await this.databaseService.executeQuery(tenant, `
      SELECT idCategoria FROM categorias ORDER BY idCategoria DESC limit 1;`, []);
    const lastIdCategoria = rows.length > 0 ? rows[0].idCategoria : "CATE0000";
    const idCategoria = nextCode(lastIdCategoria);

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO categorias (idCategoria, categoria, userId, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW());`,
      [idCategoria, body.categoria, body.userId]);

    return {
      message: 'Categoria creada exitosamente',
      result,
    };
  }

  async saveOrUpdateSubCategorie(tenant: string, body: SubCategorieDto): Promise<any> {
    if (body.idSubCategoria) {
      const subcategories = await this.databaseService.executeQuery(tenant, `
      SELECT idSubCategoria FROM subcategorias WHERE idSubCategoria = ?;`, [body.idSubCategoria]);

      if (subcategories.length > 0) {
        const result = await this.databaseService.executeQuery(tenant, `
      UPDATE subcategorias SET subCategoria = ?, SET updated_at = NOW() WHERE idSubCategoria = ?;`,
          [body.subCategoria, body.idSubCategoria]);

        return {
          message: 'SubCategoria actualizada exitosamente',
          result,
        };
      }
    }

    const rows = await this.databaseService.executeQuery(tenant, `
      SELECT idSubCategoria FROM subcategorias ORDER BY idSubCategoria DESC limit 1;`, []);
    const lastIdSubCategoria = rows.length > 0 ? rows[0].idSubCategoria : "SCAT0000";
    const idSubCategoria = nextCode(lastIdSubCategoria);

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO subcategorias (idSubCategoria, subCategoria, userId, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW());`,
      [idSubCategoria, body.subCategoria, body.userId]);

    return {
      message: 'SubCategoria creada exitosamente',
      result,
    };
  }

  async saveOrUpdateMarca(tenant: string, body: MarcaDto): Promise<any> {

    if (body.idMarca) {
      const marcas = await this.databaseService.executeQuery(tenant, `
      SELECT idMarca FROM marcas WHERE idMarca = ?;`, [body.idMarca]);

      if (marcas.length > 0) {
        const result = await this.databaseService.executeQuery(tenant, `
      UPDATE marcas SET marca = ?, SET updated_at = NOW() WHERE idMarca = ?;`,
          [body.marca, body.idMarca]);

        return {
          message: 'Marca actualizada exitosamente',
          result,
        };
      }
    }

    const rows = await this.databaseService.executeQuery(tenant, `
      SELECT idMarca FROM marcas ORDER BY idMarca DESC limit 1;`, []);
    const lastIdMarca = rows.length > 0 ? rows[0].idMarca : "MARC0000";
    const idMarca = nextCode(lastIdMarca);

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO marcas (idMarca, marca, userId, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW());`,
      [idMarca, body.marca, body.userId]);

    return {
      message: 'Marca creada exitosamente',
      result,
    };
  }

  async saveOrUpdateColor(tenant: string, body: ColorDto): Promise<any> {

    if (body.idColor) {
      const colors = await this.databaseService.executeQuery(tenant, `
      SELECT idColor FROM colores WHERE idColor = ?;`, [body.idColor]);

      if (colors.length > 0) {
        const result = await this.databaseService.executeQuery(tenant, `
      UPDATE colores SET color = ?, SET updated_at = NOW() WHERE idColor = ?;`,
          [body.color, body.idColor]);

        return {
          message: 'Color actualizado exitosamente',
          result,
        };
      }
    }

    const rows = await this.databaseService.executeQuery(tenant, `
      SELECT idColor FROM colores ORDER BY idColor DESC limit 1;`, []);
    const lastIdColor = rows.length > 0 ? rows[0].idColor : "COLO0000";
    const idColor = nextCode(lastIdColor);

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO colores (idColor, color, userId, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW());`,
      [idColor, body.color, body.userId]);

    return {
      message: 'Color creado exitosamente',
      result,
    };
  }

  async getProductById(tenant: string, idProducto: string): Promise<any> {
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
          p.cantidad,
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
        WHERE p.idProducto = ?
        GROUP BY p.idProducto
        ORDER BY p.idProducto;`, [idProducto]);

    return nuevosProductos || null;
  }
}
