import { CloudinaryUtil } from "./cloudinary-util";
import { NewProductDto } from "src/dto/admin.dto";

const cloudinaryUtil = new CloudinaryUtil();

export function nextCode(code: string): string {
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

export function buildUpdateFields(body: NewProductDto) {
  const updateFields: string[] = [];
  const updateValues: any[] = [];

  Object.keys(body).forEach((key) => {
    if (["imagen", "rutaCloudinary", "nuevaRutaCloudinary", "fotoDeleted"].includes(key)) return;

    const value = body[key as keyof NewProductDto];
    if (value !== null && value !== undefined && value !== "") {
      updateFields.push(`${key} = ?`);
      updateValues.push(value);
    }
  });

  return { updateFields, updateValues };
}

export async function moveAllProductImages(tenant: string, body: NewProductDto) {
  const fotos = await this.databaseService.executeQuery(
    tenant, `SELECT idFoto FROM fotosproductos WHERE idProducto = ?`, [body.idProducto]
  );

  for (const foto of fotos) {
    await cloudinaryUtil.moveImage(body.rutaCloudinary, body.nuevaRutaCloudinary, foto.idFoto);
    await this.databaseService.executeQuery(
      tenant,
      `UPDATE fotosproductos SET rutaCloudinary = ? WHERE idFoto = ?`,
      [body.nuevaRutaCloudinary, foto.idFoto]
    );
  }
}

export async function deleteProductImages(tenant: string, body: NewProductDto) {
  for (const foto of body.fotoDeleted) {
    const publicId = [body.rutaCloudinary, foto.idFoto].join("/");
    await cloudinaryUtil.deleteFromCloudinary(publicId);

    await this.databaseService.executeQuery(
      tenant,
      `DELETE FROM fotosproductos WHERE idFoto IN (${body.fotoDeleted.map(() => "?").join(",")})`,
      body.fotoDeleted.map(f => f.idFoto)
    );

    if (foto.isPrincipal) {
      await setNewPrincipal(tenant, body.idProducto);
    }
  }
}

export async function setNewPrincipal(tenant: string, idProducto: string) {
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

export async function addNewProductImages(tenant: string, files: Express.Multer.File[], body: NewProductDto) {
  const [principalExists] = await this.databaseService.executeQuery(
    tenant, `SELECT idFoto FROM fotosproductos WHERE idProducto = ? AND isPrincipal = 1`, [body.idProducto]
  );

  let principal = principalExists ? 0 : 1;

  for (const file of files) {
    const rows = await this.databaseService.executeQuery(tenant, `SELECT idFoto FROM fotosproductos ORDER BY idFoto DESC LIMIT 1;`);
    const lastIdFoto = rows.length > 0 ? rows[0].idFoto : "FPRD0000";
    const idFoto = nextCode(lastIdFoto);

    await this.databaseService.executeQuery(
      tenant,
      `INSERT INTO fotosproductos (idFoto, idProducto, userId, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
      [idFoto, body.idProducto, body.userId]
    );

    const upload = await cloudinaryUtil.uploadToCloudinary(file, idFoto, body.rutaCloudinary, body.nuevaRutaCloudinary);

    await this.databaseService.executeQuery(
      tenant,
      `UPDATE fotosproductos SET url_foto = ?, isPrincipal = ?, rutaCloudinary = ? WHERE idFoto = ?`,
      [upload.secure_url, principal, body.nuevaRutaCloudinary, idFoto]
    );

    principal = 0; // solo la primera nueva imagen podría ser principal
  }
}





