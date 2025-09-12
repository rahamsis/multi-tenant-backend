import { DatabaseService } from "src/database/database.service";
import { CloudinaryUtil } from "./cloudinary-util";
import { NewProductDto } from "src/dto/admin.dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class Util {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryUtil: CloudinaryUtil
  ) { }

  nextCode(code: string): string {
    // 1. Extraer las letras iniciales
    const prefix = code.match(/[A-Za-z]+/)?.[0] ?? "";

    // 2. Extraer la parte numérica
    const numberPart = code.match(/\d+/)?.[0] ?? "0";

    // 3. Convertir a número e incrementar
    const nextNumber = (parseInt(numberPart, 10) + 1).toString();

    // 4. Rellenar con ceros a la izquierda según la longitud original
    const paddedNumber = nextNumber.padStart(numberPart.length, "0");

    return prefix + paddedNumber;
  }

  buildUpdateFields(body: NewProductDto) {
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.keys(body).forEach((key) => {
      if (["imagen", "rutaCloudinary", "nuevaRutaCloudinary", "fotoDeleted"].includes(key)) return;

      const value = body[key as keyof NewProductDto];
      if (value !== null && value !== "null" && value !== undefined && value !== "") {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    });

    return { updateFields, updateValues };
  }

  parseFotoDeleted(body: NewProductDto): void {
    // let fotoDeletedArray: FotoDeleted[] = [];
    if (typeof body.fotoDeleted === 'string') {
      try {
        body.fotoDeleted = JSON.parse(body.fotoDeleted);
      } catch {
        body.fotoDeleted = [];
      }
    } else if (Array.isArray(body.fotoDeleted)) {
      body.fotoDeleted = body.fotoDeleted;
    }
  }

  async moveAllProductImages(tenant: string, body: NewProductDto) {
    const fotos = await this.databaseService.executeQuery(
      tenant, `SELECT idFoto FROM fotosproductos WHERE idProducto = ?`, [body.idProducto]
    );

    for (const foto of fotos) {
      await this.cloudinaryUtil.moveImage(body.rutaCloudinary, body.nuevaRutaCloudinary, foto.idFoto);

      await this.databaseService.executeQuery(
        tenant,
        `UPDATE fotosproductos SET rutaCloudinary = ? WHERE idFoto = ?`,
        [body.nuevaRutaCloudinary, foto.idFoto]
      );
    }
  }

  async deleteProductImages(tenant: string, body: NewProductDto) {
    for (const foto of body.fotoDeleted) {
      const publicId = body.rutaCloudinary + foto.idFoto;
      await this.cloudinaryUtil.deleteFromCloudinary(publicId);

      await this.databaseService.executeQuery(
        tenant,
        `DELETE FROM fotosproductos WHERE idFoto IN (${body.fotoDeleted.map(() => "?").join(",")})`,
        body.fotoDeleted.map(f => f.idFoto)
      );

      if (foto.isPrincipal) {
        await this.setNewPrincipal(tenant, body.idProducto);
      }
    }
  }

  async setNewPrincipal(tenant: string, idProducto: string) {
    const [newPrincipal] = await this.databaseService.executeQuery(
      tenant,
      `SELECT idFoto FROM fotosproductos WHERE idProducto = ? ORDER BY idFoto ASC LIMIT 1`,
      [idProducto]
    );

    if (newPrincipal) {
      await this.databaseService.executeQuery(
        tenant,
        `UPDATE fotosproductos SET isPrincipal = 1 WHERE idFoto = ?`,
        [newPrincipal.idFoto]
      );
    }
  }

  async addNewProductImages(tenant: string, files: Express.Multer.File[], body: NewProductDto) {
    const principalExists = await this.databaseService.executeQuery(
      tenant, `SELECT idFoto FROM fotosproductos WHERE idProducto = ? AND isPrincipal = 1`, [body.idProducto]
    );

    let isPrincipalAssigned = principalExists.length > 0;

    for (const [index, file] of files.entries()) {
      const rows = await this.databaseService.executeQuery(tenant, `SELECT idFoto FROM fotosproductos ORDER BY idFoto DESC LIMIT 1;`);
      const lastIdFoto = rows.length > 0 ? rows[0].idFoto : "FPRD0000";
      const idFoto = this.nextCode(lastIdFoto);

      await this.databaseService.executeQuery(
        tenant,
        `INSERT INTO fotosproductos (idFoto, idProducto, userId, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
        [idFoto, body.idProducto, body.userId]
      );

      const upload = await this.cloudinaryUtil.uploadToCloudinary(file, idFoto, body.nuevaRutaCloudinary);

      // Solo asignamos principal a la primera foto nueva si no hay ninguna existente
      const principal = !isPrincipalAssigned && index === 0 ? 1 : 0;

      await this.databaseService.executeQuery(
        tenant,
        `UPDATE fotosproductos SET url_foto = ?, isPrincipal = ?, rutaCloudinary = ? WHERE idFoto = ?`,
        [upload.secure_url, principal, body.nuevaRutaCloudinary, idFoto]
      );
    }
  }
}