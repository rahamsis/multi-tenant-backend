import { Injectable } from '@nestjs/common';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type PdfItem = {
  key: string;
  name: string;
  size?: number;
  lastModified?: Date;
};

type CoverPdf = {
  key: string;
  name: string;
  url: string;
}

@Injectable()
export class R2Service {
  private s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  private bucketFilesImportony = process.env.R2_BUCKET_NAME!;
  private bucketImagesImportony = process.env.R2_BUCKET_NAME_IMAGES!;
  private prefix = process.env.R2_PDF_PREFIX || '';
  private ttl = Number(process.env.SIGN_TTL_SECONDS || 3600);

  async listAllPdfs(): Promise<PdfItem[]> {
    const results: PdfItem[] = [];
    let token: string | undefined;

    do {
      const resp = await this.s3.send(new ListObjectsV2Command({
        Bucket: this.bucketFilesImportony,
        Prefix: this.prefix || undefined,
        ContinuationToken: token,
      }));

      for (const o of resp.Contents || []) {
        if (!o.Key) continue;
        if (!o.Key.toLowerCase().endsWith('.pdf')) continue;

        results.push({
          key: o.Key,
          name: decodeURIComponent(o.Key.replace(this.prefix, '')),
          size: o.Size,
          lastModified: o.LastModified,
        });
      }
      token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (token);

    results.sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0));
    return results;
  }

  async signedViewUrl(key: string, bucket: string) {
    const bucket_name = bucket === "catalogos"
      ? this.bucketFilesImportony
      : bucket === "covers"
      ? this.bucketImagesImportony
      : "";
    const cmd = new GetObjectCommand({ Bucket: bucket_name, Key: key });
    return getSignedUrl(this.s3, cmd, { expiresIn: this.ttl });
  }

  async signedDownloadUrl(key: string) {
    const filename = key.split('/').pop() || 'archivo.pdf';
    const cmd = new GetObjectCommand({
      Bucket: this.bucketFilesImportony,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });
    return getSignedUrl(this.s3, cmd, { expiresIn: this.ttl });
  }

  async listAllCoversPDf(): Promise<CoverPdf[]> {
    const covers: CoverPdf[] = [];
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketImagesImportony,
        // // Prefix opcional si quieres filtrar solo thumbnails de PDFs
        // Prefix: "thumbnails/",
      });

      const response = await this.s3.send(command);

      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key) {
            // Extraer un nombre legible del key, por ejemplo quitar carpeta y extensión
            const name = item.Key.split("/").pop()?.replace(/\.[^/.]+$/, "") || item.Key;
            // Construir la URL pública del archivo
            const url = `${process.env.R2_ENDPOINT}/${item.Key}`;
            covers.push({
              key: item.Key,
              name,
              url,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error listando portadas de PDFs:", err);
    }

    return covers;
  }
}
