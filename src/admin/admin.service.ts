import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CategorieDto, ColorDto, MarcaDto, MenuDto, NewAttributeDto, NewProductDto, ProductDto, SubCategorieDto, WebSite } from 'src/dto/admin.dto';
import { CloudinaryUtil } from 'src/util/cloudinary-util';
import { Util } from 'src/util/util';

@Injectable()
export class AdminService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryUtil: CloudinaryUtil,
    private readonly util: Util
  ) { }

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
      SELECT idCategoria, categoria, activo FROM categorias;`);

    return categories || null;
  }

  async getAllSubCategories(tenant: string): Promise<any> {
    const subCategories = await this.databaseService.executeQuery(tenant, `
      SELECT sc.idSubCategoria, sc.subCategoria, sc.activo, c.idCategoria, c.categoria 
      FROM subcategorias sc
      LEFT JOIN categorias c on sc.idCategoria = c.idCategoria`);

    return subCategories || null;
  }

  async getAllBrands(tenant: string): Promise<any> {
    const brands = await this.databaseService.executeQuery(tenant, `
      SELECT idMarca, urlFoto, marca, activo FROM marcas;`);

    return brands || null;
  }

  async getAllColors(tenant: string): Promise<any> {
    const colors = await this.databaseService.executeQuery(tenant, `
      SELECT idColor, color, activo FROM colores;`);

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
    const idProducto = this.util.nextCode(lastIdProducto);

    // 1. Subir nuevas imágenes
    if (files?.length) {
      await this.util.addNewProductImages(tenant, files, idProducto, body.userId, body.nuevaRutaCloudinary);
    }

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO productos (idProducto, idCategoria, idSubCategoria, idMarca, nombre, precio, cantidad, idColor, 
      descripcion, tipo, destacado, nuevo, masVendido, activo, userId, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());`,
      [
        idProducto,
        body.idCategoria,
        body.idSubCategoria,
        body.idMarca,
        body.nombre,
        body.precio,
        body.cantidad,
        body.idColor,
        body.descripcion,
        body.tipo,
        body.destacado,
        body.nuevo,
        body.masVendido,
        body.activo ? 1 : 0,
        body.userId]);

    // Parse packItemsToAdd, packItemsToRemove y packItemsToUpdate to ensure it's an array
    this.util.parsePackItems(body);

    // añadimos el paquete en caso tuviera
    if (body.packItemsToAdd && body.packItemsToAdd.length) {
      for (const item of body.packItemsToAdd) {
        const rowPaquetes = await this.databaseService.executeQuery(tenant, `
        SELECT idProductoPaquete FROM productospaquete ORDER BY idProductoPaquete DESC limit 1;`, []);
        const lastIdProductoPaquete = (rowPaquetes.length > 0 && rowPaquetes[0].idProductoPaquete) ? rowPaquetes[0].idProductoPaquete : "PRPQ0000";
        const newIdProductoPaquete = this.util.nextCode(lastIdProductoPaquete);

        await this.databaseService.executeQuery(tenant, `
          INSERT INTO productospaquete (idProductoPaquete, idPaquete, idProducto, cantidad, userId, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW());`,
          [newIdProductoPaquete,
            idProducto,
            item.idProducto,
            item.cantidad,
            body.userId
          ]);
      }
    }

    return {
      message: 'Producto creado exitosamente',
      result,
    };
  }

  async updateProduct(tenant: string, files: Express.Multer.File[], body: NewProductDto): Promise<any> {

    // Parse fotoDeleted to ensure it's an array
    this.util.parseFotoDeleted(body);
    // Parse packItemsToAdd, packItemsToRemove y packItemsToUpdate to ensure it's an array
    this.util.parsePackItems(body);

    // 1. Actualizar campos del producto
    const { updateFields, updateValues } = this.util.buildUpdateFields(body);

    // 2. Eliminar imágenes si corresponde
    if (body.fotoDeleted.length && body.fotoDeleted.length > 0) {
      await this.util.deleteProductImages(tenant, body);
    }

    // 3. Mover imágenes si cambió la ruta
    if (body.rutaCloudinary !== body.nuevaRutaCloudinary) {
      await this.util.moveAllProductImages(tenant, body);
    }

    // 4. Subir nuevas imágenes
    if (files?.length && files?.length > 0) {
      await this.util.addNewProductImages(tenant, files, body.idProducto, body.userId, body.nuevaRutaCloudinary);
    }

    // 5. Actualizar producto
    const sql = `UPDATE productos SET ${updateFields.join(", ")}, updated_at = NOW() WHERE idProducto = ?`;
    updateValues.push(body.idProducto);
    const result = await this.databaseService.executeQuery(tenant, sql, updateValues);

    // 6. Actualizamos paquetesproductos según sea necesario
    // 6.1 eliminamos el productos del paquete en caso tuviera
    if (body.packItemsToRemove && body.packItemsToRemove.length > 0) {
      for (const item of body.packItemsToRemove) {
        await this.databaseService.executeQuery(tenant, `
        DELETE FROM productospaquete WHERE idProductoPaquete = ? and idPaquete = ?;`,
          [item.idProductoPaquete, item.idPaquete]);
      }
    }

    // 6.2 actualizamos el producto del paquete en caso tuviera
    if (body.packItemsToUpdate && body.packItemsToUpdate.length > 0) {
      for (const item of body.packItemsToUpdate) {
        await this.databaseService.executeQuery(tenant, `
        UPDATE productospaquete SET cantidad = ? WHERE idProductoPaquete = ? and  idPaquete = ?;`,
          [item.cantidad, item.idProductoPaquete, item.idPaquete]);
      }
    }
    // 6.3 añadimos el paquete en caso tuviera
    if (body.packItemsToAdd && body.packItemsToAdd.length > 0) {
      for (const item of body.packItemsToAdd) {
        const rowPaquetes = await this.databaseService.executeQuery(tenant, `
        SELECT idProductoPaquete FROM productospaquete ORDER BY idProductoPaquete DESC limit 1;`, []);
        const lastIdProductoPaquete = (rowPaquetes.length > 0 && rowPaquetes[0].idProductoPaquete) ? rowPaquetes[0].idProductoPaquete : "PRPQ0000";
        const newIdProductoPaquete = this.util.nextCode(lastIdProductoPaquete);

        await this.databaseService.executeQuery(tenant, `
          INSERT INTO productospaquete (idProductoPaquete, idPaquete, idProducto, cantidad, userId, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW());`,
          [newIdProductoPaquete,
            body.idProducto,
            item.idProducto,
            item.cantidad,
            body.userId
          ]);
      }
    }

    return {
      message: "producto actualizado exitosamente",
      result,
    };
  }

  async saveOrUpdateCategorie(tenant: string, body: CategorieDto): Promise<any> {

    if (body.idCategoria) {
      const categories = await this.databaseService.executeQuery(tenant, `
      SELECT idCategoria FROM categorias WHERE idCategoria = ?;`, [body.idCategoria]);

      if (categories.length > 0) {
        const result = await this.databaseService.executeQuery(tenant, `
          UPDATE categorias SET categoria = ?, userId = ?, updated_at = NOW() WHERE idCategoria = ?;`,
          [body.categoria, body.userId, body.idCategoria]);

        return {
          message: 'Categoria actualizada exitosamente',
          result,
        };
      }
    }

    const rows = await this.databaseService.executeQuery(tenant, `
      SELECT idCategoria FROM categorias ORDER BY idCategoria DESC limit 1;`, []);
    const lastIdCategoria = rows.length > 0 ? rows[0].idCategoria : "CATE0000";
    const idCategoria = this.util.nextCode(lastIdCategoria);

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO categorias (idCategoria, categoria, userId, activo, created_at, updated_at)
      VALUES (?, ?, ?, 1, NOW(), NOW());`,
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
          UPDATE subcategorias SET subCategoria = ?, idCategoria = ?,  updated_at = NOW() WHERE idSubCategoria = ?;`,
          [body.subCategoria, body.idCategoria, body.idSubCategoria]);

        return {
          message: 'SubCategoria actualizada exitosamente',
          result,
        };
      }
    }

    const rows = await this.databaseService.executeQuery(tenant, `
      SELECT idSubCategoria FROM subcategorias ORDER BY idSubCategoria DESC limit 1;`, []);
    const lastIdSubCategoria = rows.length > 0 ? rows[0].idSubCategoria : "SCAT0000";
    const idSubCategoria = this.util.nextCode(lastIdSubCategoria);

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO subcategorias (idSubCategoria, subCategoria, idCategoria, userId, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW());`,
      [idSubCategoria, body.subCategoria, body.idCategoria, body.userId]);

    return {
      message: 'SubCategoria creada exitosamente',
      result,
    };
  }

  async deleteSubCategorie(tenant: string, idSubCategoria: string) {
    const exist = await this.databaseService.executeQuery(tenant, `
      SELECT idProducto from productos WHERE idSubCategoria = ?`, [idSubCategoria]);

    if (exist.length > 0) {
      return {
        message: "No se pudo eliminar, hay productos asociados",
      }
    } else {
      const result = await this.databaseService.executeQuery(tenant, `
      DELETE from subcategorias WHERE idSubCategoria = ?`, [idSubCategoria]);

      return {
        message: "sub categoria eliminada correctamente",
        result
      }
    }

  }

  async saveOrUpdateMarca(tenant: string, body: NewAttributeDto, file: Express.Multer.File): Promise<any> {
    const rutaCloudinary = tenant + "/marcas/"

    if (body.idAttribute) {
      const marcas = await this.databaseService.executeQuery(tenant, `
      SELECT idMarca FROM marcas WHERE idMarca = ?;`, [body.idAttribute]);

      if (marcas.length > 0) {
        if (file) {
          const publicId = rutaCloudinary + body.idAttribute;
          //eliminar la imagen si file no esta vacio
          await this.cloudinaryUtil.deleteFromCloudinary(publicId);

          //subir nueva imagen si file no esta vacio
          const upload = await this.cloudinaryUtil.uploadToCloudinary(file, body.idAttribute, rutaCloudinary);

          //actualizar la url de la imagen de la marca
          await this.databaseService.executeQuery(tenant, `
            UPDATE marcas SET marca = ?, urlFoto = ? WHERE idMarca = ?;`,
            [body.newAttribute, upload.secure_url, body.idAttribute]);
        }

        const result = await this.databaseService.executeQuery(tenant, `
          UPDATE marcas SET marca = ?, updated_at = NOW() WHERE idMarca = ?;`,
          [body.newAttribute, body.idAttribute]);

        return {
          message: 'Marca actualizada exitosamente',
          result,
        };
      }
    }

    const rows = await this.databaseService.executeQuery(tenant, `
      SELECT idMarca FROM marcas ORDER BY idMarca DESC limit 1;`, []);
    const lastIdMarca = rows.length > 0 ? rows[0].idMarca : "MARC0000";
    const idMarca = this.util.nextCode(lastIdMarca);

    const upload = file ?
      await this.cloudinaryUtil.uploadToCloudinary(file, idMarca, rutaCloudinary) : null;

    const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO marcas (idMarca, marca, urlFoto, activo, userId, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, NOW(), NOW());`,
      [idMarca, body.newAttribute, upload.secure_url, body.userId]);

    return {
      message: 'Marca creada exitosamente',
      result,
    };
  }

  async deleteBrand(tenant: string, idMarca: string) {
    const exist = await this.databaseService.executeQuery(tenant, `
      SELECT idProducto from productos WHERE idMarca = ?`, [idMarca]);

    if (exist.length > 0) {
      return {
        message: "No se pudo eliminar, hay productos asociados",
      }
    } else {
      const rutaCloudinary = tenant + "/marcas/"
      const publicId = rutaCloudinary + idMarca;

      //eliminar la imagen
      await this.cloudinaryUtil.deleteFromCloudinary(publicId);

      const result = await this.databaseService.executeQuery(tenant, `
        DELETE from marcas WHERE idMarca = ?`, [idMarca]);

      return {
        message: "marca eliminada correctamente",
        result
      }
    }

  }

  async saveOrUpdateColor(tenant: string, body: ColorDto): Promise<any> {

    if (body.idColor) {
      const colors = await this.databaseService.executeQuery(tenant, `
      SELECT idColor FROM colores WHERE idColor = ?;`, [body.idColor]);

      if (colors.length > 0) {
        const result = await this.databaseService.executeQuery(tenant, `
      UPDATE colores SET color = ?, updated_at = NOW() WHERE idColor = ?;`,
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
    const idColor = this.util.nextCode(lastIdColor);

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
        p.tipo,
        p.cantidad,
        cl.idColor,
        cl.color,
        p.descripcion,
        p.destacado,
        p.nuevo,
        p.masVendido,
        p.activo,
        -- fotos: subconsulta correlacionada
        (
          SELECT COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'idFoto', fp.idFoto,
                'url_foto', fp.url_foto,
                'rutaCloudinary', fp.rutaCloudinary,
                'isPrincipal', fp.isPrincipal
              )
            ),
            JSON_ARRAY()
          )
          FROM fotosproductos fp
          WHERE fp.idProducto = p.idProducto
        ) AS fotos,
        -- productos del paquete: subconsulta correlacionada
        (
          SELECT COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'idProductoPaquete', pp.idProductoPaquete,
                'idPaquete', pp.idPaquete,
                'idProducto', pp.idProducto,
                  'nombre', p.nombre,
                  'imagen', fp.url_foto,
                'cantidad', pp.cantidad
              )
            ),
            JSON_ARRAY()
          )
          FROM productospaquete pp
          LEFT JOIN fotosproductos fp ON fp.idProducto = pp.idProducto
          WHERE pp.idPaquete = p.idProducto
        ) AS productospaquete
      FROM productos p
      LEFT JOIN categorias c ON p.idCategoria = c.idCategoria
      LEFT JOIN subcategorias sc ON p.idSubCategoria = sc.idSubCategoria
      LEFT JOIN marcas m ON p.idMarca = m.idMarca
      LEFT JOIN colores cl ON p.idColor = cl.idColor
      WHERE p.idProducto = ?;`, [idProducto]);

    return nuevosProductos || null;
  }

  async updateStatusCategorie(tenant: string, body: { idCategoria: number, status: number }): Promise<any> {
    const updatecategorie = await this.databaseService.executeQuery(tenant, `
        UPDATE categorias SET activo = ? WHERE idCategoria = ?
        `, [body.status, body.idCategoria])

    return updatecategorie || null;
  }

  async updateStatusSubCategorie(tenant: string, body: { idSubCategoria: number, status: number }): Promise<any> {
    const updatesubcategorie = await this.databaseService.executeQuery(tenant, `
        UPDATE subcategorias SET activo = ? WHERE idSubCategoria = ?
        `, [body.status, body.idSubCategoria])

    return updatesubcategorie || null;
  }

  async updateStatusBrand(tenant: string, body: { idMarca: number, status: number }): Promise<any> {
    const updatecategorie = await this.databaseService.executeQuery(tenant, `
        UPDATE marcas SET activo = ? WHERE idMarca = ?
        `, [body.status, body.idMarca])

    return updatecategorie || null;
  }

  async updateStatusColor(tenant: string, body: { idColor: number, status: number }): Promise<any> {
    const updatecolor = await this.databaseService.executeQuery(tenant, `
        UPDATE colores SET activo = ? WHERE idColor = ?
        `, [body.status, body.idColor])

    return updatecolor || null;
  }

  async saveMenu(tenant: string, body: MenuDto[]): Promise<any> {

    await this.databaseService.executeQuery(tenant, `DELETE FROM menu;`, []);

    let lastIdMenu = "MENU0000";

    for (const item of body) {
      lastIdMenu = this.util.nextCode(lastIdMenu);

      const result = await this.databaseService.executeQuery(tenant, `
      INSERT INTO menu (
        idMenu, 
        urlMenu, 
        titulo, 
        idCategoria,
        userId,
        orden,
        estado,
        created_at, 
        updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW());`,
        [
          lastIdMenu,
          item.urlMenu,
          item.titulo,
          item.idCategoria,
          item.userId,
          item.orden,
          item.estado
        ]);
    }

    return {
      status: 200,
    };
  }

  async getWebSite(tenant: string): Promise<any> {
    const empresa = await this.databaseService.executeQuery(tenant, `
      SELECT 
        e.idEmpresa, 
        e.nombre, 
        e.telefonoPrincipal, 
        e.telefonoSecundario, 
        e.direccionPrincipal, 
        e.direccionSecundaria, 
        e.correo,
        e.logo
      FROM empresa e`);

    return empresa || null;
  }

  async updateWebSite(tenant: string, body: WebSite, file: Express.Multer.File): Promise<any> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.keys(body).forEach((key) => {
      if (["nombre", "idEmpresa"].includes(key)) return;

      const value = body[key as keyof WebSite];
      if (value != null && value != "null" && value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value)
      }
    })

    const rutaCloudinary = tenant + "/"
    if (file) {
      const upload = await this.cloudinaryUtil.uploadToCloudinary(file, body.idEmpresa, rutaCloudinary)
      updateValues.push("logo = ?")
      updateValues.push(upload.secure_url);
    }

    const sql = `UPDATE empresa SET ${updateFields.join(", ")}, updated_at = NOW() WHERE idEmpresa = ?`;
    updateValues.push(body.idEmpresa);

    const result = await this.databaseService.executeQuery(tenant, sql, updateValues);
    return result || null
  }
}
