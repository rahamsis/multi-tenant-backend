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

    // async uploadToCloudinary(file: Express.Multer.File, id: string, newFolder: string): Promise<any> {
    //     console.error("datos: ", id, newFolder)
    //     return new Promise((resolve, reject) => {
    //         const uploadStream = cloudinary.uploader.upload_stream(
    //             {
    //                 folder: newFolder,
    //                 public_id: id,       // 👈 nombre único para la imagen
    //                 overwrite: true,     // 👈 reemplaza si ya existe
    //                 invalidate: true     // 👈 limpia caché CDN de Cloudinary
    //             },
    //             (error, result) => {
    //                 if (error) {
    //                     console.error("❌ Error al subir a Cloudinary:", error);
    //                     return reject(error);
    //                 }
    //                 resolve(result);
    //             },
    //         );

    //         Readable.from(file.buffer).pipe(uploadStream);
    //     });
    // }
    async uploadToCloudinary(
        file: Express.Multer.File,
        id: string,
        newFolder: string
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                // Validar archivo
                if (!file?.buffer || file.buffer.length === 0) {
                    console.error("❌ Buffer vacío o inválido:", file);
                    return reject(new Error("Buffer vacío o inválido"));
                }

                // console.log("🔹 Subiendo archivo a Cloudinary:", id, newFolder, "Tamaño:", file.buffer.length);

                // Crear stream de subida
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: newFolder,
                        public_id: id,
                        overwrite: true,
                        invalidate: true,
                    },
                    (error: any | undefined, result?: any) => {
                        if (error) {
                            console.error("❌ Error al subir a Cloudinary:", error);
                            return reject(error);
                        }
                        if (!result) {
                            console.error("❌ No se recibió respuesta de Cloudinary");
                            return reject(new Error("No se recibió respuesta de Cloudinary"));
                        }
                        // console.log("✅ Imagen subida correctamente:", result.secure_url);
                        resolve(result);
                    }
                );

                // Convertir buffer a stream y añadir listener de error
                const readable = Readable.from(file.buffer);
                readable.on("error", (err) => {
                    console.error("❌ Error en el stream:", err);
                    reject(err);
                });

                // Iniciar subida
                readable.pipe(uploadStream);

            } catch (err) {
                console.error("❌ Error inesperado en uploadToCloudinary:", err);
                reject(err);
            }
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