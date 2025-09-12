import { Body, Controller, Get, HttpStatus, Post, Put, Query, Res, Req, Headers, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { ApiTags } from '@nestjs/swagger';
import { Response, } from 'express';
import { CategorieDto, ColorDto, MarcaDto, NewProductDto, ProductDto, SubCategorieDto } from 'src/dto/admin.dto';

@ApiTags('Admin')
@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('/all-products')
  async getAllProduct(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.adminService.getAllProduct(tenant);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Get('/all-categories')
  async getAllCategories(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.adminService.getAllCategories(tenant);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Get('/all-subcategories')
  async getAllSubCategories(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.adminService.getAllSubCategories(tenant);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Get('/all-brands')
  async getAllBrands(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.adminService.getAllBrands(tenant);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Get('/all-colors')
  async getAllColors(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.adminService.getAllColors(tenant);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Put('/update-status')
  async updateStatus(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
    @Body() body: { idProduct: number, status: number }
  ) {
    try {
      const data = await this.adminService.updateStatus(tenant, body);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Post('/save-product')
  @UseInterceptors(FilesInterceptor('files', 3, {
    limits: { fileSize: 50 * 1024 * 1024 }, // ⬅️ 50 MB por archivo
  }))
  async saveProduct(
    @Headers('x-tenant-id') tenant: string,
    @UploadedFiles() file: Express.Multer.File[],
    @Res() res: Response,
    @Body() body: NewProductDto,
  ) {
    try {
      const data = await this.adminService.saveProduct(tenant, file, body);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Put('/update-product')
  @UseInterceptors(FilesInterceptor('files', 3, {
    limits: { fileSize: 50 * 1024 * 1024 }, // ⬅️ 50 MB por archivo
  }))
  async updateProduct(
    @Headers('x-tenant-id') tenant: string,
    @UploadedFiles() file: Express.Multer.File[],
    @Res() res: Response,
    @Body() body: NewProductDto,
  ) {
    try {
      const data = await this.adminService.updateProduct(tenant, file, body);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Post('/update-or-save-categorie')
  async saveOrUpdateCategorie(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
    @Body() body: CategorieDto,
  ) {
    try {
      const data = await this.adminService.saveOrUpdateCategorie(tenant, body);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Post('/update-or-save-subcategorie')
  async saveOrUpdateSubCategorie(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
    @Body() body: SubCategorieDto,
  ) {
    try {
      const data = await this.adminService.saveOrUpdateSubCategorie(tenant, body);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Post('/update-or-save-marca')
  async saveOrUpdateMarca(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
    @Body() body: MarcaDto,
  ) {
    try {
      const data = await this.adminService.saveOrUpdateMarca(tenant, body);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Post('/update-or-save-color')
  async saveOrUpdateColor(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
    @Body() body: ColorDto,
  ) {
    try {
      const data = await this.adminService.saveOrUpdateColor(tenant, body);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Get('/product-by-idProduct')
  async getProductById(
    @Headers('x-tenant-id') tenant: string,
    @Query('idProduct') idProducto: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.adminService.getProductById(tenant, idProducto);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }
}
