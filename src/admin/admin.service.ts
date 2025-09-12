import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CategorieDto, ColorDto, MarcaDto, NewProductDto, ProductDto, SubCategorieDto } from 'src/dto/admin.dto';
import { nextCode, buildUpdateFields, moveAllProductImages, deleteProductImages, addNewProductImages } from 'src/util/util';

@Injectable()
export class AdminService {
  constructor(private readonly databaseService: DatabaseService) { }

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
          p.destacado,
          p.nuevo, 
          p.masVendido, 
          p.activo, 
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'idFoto', fp.idFoto,
              'url_foto', fp.url_foto,
              'isPrincipal', fp.isPrincipal
            )
          ) AS fotos
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
    const rows = await this.databaseService.executeQuery(tenant, `
      SELECT idProducto FROM productos ORDER BY idProducto DESC limit 1;`, []);
    const lastIdProducto = rows.length > 0 ? rows[0].idProducto : "PROD0000";
    const idProducto = nextCode(lastIdProducto);

    // 1. Subir nuevas imágenes
    if (files?.length) {
      await addNewProductImages(tenant, files, body);
    }

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO productos (idProducto, idCategoria, idSubCategoria, idMarca, nombre, precio, idColor, 
      descripcion, destacado, nuevo, masVendido, activo, userId, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());`,
      [
        idProducto,
        body.idCategoria,
        body.idSubCategoria,
        body.idMarca,
        body.nombre,
        body.precio,
        body.idColor,
        body.descripcion,
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
    console.log("a actualizar: ", body)

    // 1. Actualizar campos del producto
    const { updateFields, updateValues } = buildUpdateFields(body);

    // 2. Mover imágenes si cambió la ruta
    if (body.rutaCloudinary !== body.nuevaRutaCloudinary) {
      await moveAllProductImages(tenant, body);
    }

    // 3. Eliminar imágenes si corresponde
    if (body.fotoDeleted?.length) {
      await deleteProductImages(tenant, body);
    }

    // 4. Subir nuevas imágenes
    if (files?.length) {
      await addNewProductImages(tenant, files, body);
    }

    // 5. Actualizar producto
    const sql = `UPDATE productos SET ${updateFields.join(", ")}, updated_at = NOW() WHERE idProducto = ?`;
    updateValues.push(body.idProducto);

    const result = await this.databaseService.executeQuery(tenant, sql, updateValues);

    return {
      message: "producto actualizado exitosamente",
      result,
    };

    // if (body.fotoDeleted && body.fotoDeleted.length > 0) {
    //   // Eliminar las imágenes de Cloudinary y la base de datos
    //   for (const foto of body.fotoDeleted) {

    //     const publicId = [body.rutaCloudinary, foto.idFoto].join("/");
    //     await this.deleteFromCloudinary(publicId);

    //     await this.databaseService.executeQuery(
    //       tenant,
    //       `DELETE FROM fotosproductos WHERE idFoto IN (${body.fotoDeleted.map(() => '?').join(',')})`,
    //       body.fotoDeleted.map(f => f.idFoto)
    //     );

    //     // si la imagen es principal poner otra como principal
    //     if (foto.isPrincipal) {
    //       const [newPrincipal] = await this.databaseService.executeQuery(
    //         tenant, `SELECT idFoto FROM fotosproductos WHERE idProducto = ? ORDER BY idFoto ASC LIMIT 1`, [body.idProducto]
    //       );

    //       if (newPrincipal) {
    //         await this.databaseService.executeQuery(
    //           tenant, `UPDATE fotosproductos SET isPrincipal = 1 WHERE idFoto = ?`, [newPrincipal.idFoto]
    //         );
    //       }
    //     }
    //   }
    // }

    // Manejo de imágenes en caso de update por imagenes nuevas ya que  si son las mismas imagenes no envia files
    // if (files && files.length > 0) {
    //   //Buscamos si existe alguna imagen principal
    //   const [principalExists] = await this.databaseService.executeQuery(
    //     tenant, `SELECT idFoto FROM fotosproductos WHERE idProducto = ? AND isPrincipal = 1`, [body.idProducto]
    //   );

    //   let principal = principalExists ? 0 : 1; // Si ya existe una principal, las nuevas no lo serán

    //   for (const file of files) {
    //     const rows = await this.databaseService.executeQuery(tenant, `
    //           SELECT idFoto FROM fotosproductos ORDER BY idFoto DESC limit 1;`, []);
    //     const lastIdFoto = rows.length > 0 ? rows[0].idFoto : "FPRD0000";
    //     const idFoto = nextCode(lastIdFoto);

    //     const fotoResult = await this.databaseService.executeQuery(
    //       tenant,
    //       `INSERT INTO fotosproductos (idFoto, idProducto, userId, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
    //       [idFoto, body.idProducto, body.userId]
    //     );

    //     const upload = await this.uploadToCloudinary(
    //       file,
    //       idFoto,
    //       body.rutaCloudinary,
    //       body.nuevaRutaCloudinary
    //     );

    //     await this.databaseService.executeQuery(
    //       tenant,
    //       `UPDATE fotosproductos SET url_foto = ?, isPrincipal = ?, rutaCloudinary = ? WHERE idFoto = ?`,
    //       [upload.secure_url, principal, body.nuevaRutaCloudinary, idFoto]
    //     );
    //   }


    //   // Siempre actualizamos la fecha
    //   updateFields.push("updated_at = NOW()");

    //   // Agregamos el ID del usuario al final
    //   updateValues.push(body.idProducto);

    //   // Construimos la consulta dinámica
    //   const sql = `
    //       UPDATE productos 
    //       SET ${updateFields.join(", ")} 
    //       WHERE idProducto = ?`;
    //   console.log("sql: ", sql)
    //   console.log("values: ", updateValues)
    //   const result = await this.databaseService.executeQuery(tenant, sql, updateValues);

    //   return {
    //     message: 'producto actualizado exitosamente',
    //     result,
    //   };
    // }
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
          p.destacado,
          p.nuevo, 
          p.masVendido, 
          p.activo,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'idFoto', fp.idFoto,
              'url_foto', fp.url_foto,
              'isPrincipal', fp.isPrincipal
            )
          ) AS fotos
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
