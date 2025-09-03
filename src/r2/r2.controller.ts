import { Controller, Get, Query, HttpStatus, Res, } from '@nestjs/common';
import { R2Service } from './r2.service';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('catalogos')
@Controller('catalogos')
export class R2Controller {
  constructor(private readonly r2: R2Service) { }

  // GET /pdfs -> lista con URLs firmadas (ver y descargar)
  @Get('/all-catalogos')
  async allcatalogos() {
    const items = await this.r2.listAllPdfs();
    const withUrls = await Promise.all(items.map(async (f) => {
      const viewUrl = await this.r2.signedViewUrl(f.key, "catalogos");
      const downloadUrl = await this.r2.signedDownloadUrl(f.key);
      return { ...f, viewUrl, downloadUrl };
    }));
    return withUrls;
  }

  @Get('/all-covers-catalogos')
  async allCovers(
    @Res() res: Response
  ) {
    try {
      const items = await this.r2.listAllCoversPDf();
      const withUrls = await Promise.all(items.map(async (f) => {
        const viewUrl = await this.r2.signedViewUrl(f.key, "covers");
        return { ...f, viewUrl };
      }));

      return res.status(HttpStatus.OK).json(withUrls);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  // GET /pdfs/sign?key=pdfs/ejemplo.pdf -> firma uno puntual
  // @Get('sign')
  // async sign(@Query('key') key: string) {
  //   const viewUrl = await this.r2.signedViewUrl(key);
  //   const downloadUrl = await this.r2.signedDownloadUrl(key);
  //   return { key, viewUrl, downloadUrl };
  // }
}
