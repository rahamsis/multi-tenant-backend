import { Injectable } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from 'stream';

@Injectable()
export class CloudinaryUtil {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });
    }

    async uploadToCloudinary(file: Express.Multer.File, id: string, newFolder: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: newFolder,
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

    async deleteFromCloudinary(publicId: string): Promise<void> {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error("❌ Error al eliminar imagen:", error);
            throw error;
        }
    }

    async moveImage(oldPath: string, newPath: string, namePicture: string): Promise<string> {
        try {
            const rutaAntigua = oldPath + namePicture;
            const nuevaRuta = newPath + namePicture;

            const result = await cloudinary.uploader.rename(rutaAntigua, nuevaRuta, {
                overwrite: true,   // sobrescribe si ya existe en la ruta nueva
                invalidate: true   // limpia la caché de CDN
            });

            return result.secure_url;
        } catch (error) {
            console.error("❌ Error al mover/copiar imagen:", error);
            throw error;
        }
    }
}