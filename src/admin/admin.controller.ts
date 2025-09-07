import { Body, Controller, Get, HttpStatus, Post, Put, Query, Res, Req, Headers, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { ApiTags } from '@nestjs/swagger';
import { Response, } from 'express';
import { ProductDto } from 'src/dto/admin.dto';

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
  async updateProduct(
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
  @UseInterceptors(FilesInterceptor('files', 3))
  async saveProduct(
    @Headers('x-tenant-id') tenant: string,
    @UploadedFiles() file: Express.Multer.File[],
    @Res() res: Response,
    @Body() body: ProductDto,
  ) {
    try {
      const data = await this.adminService.saveProduct(tenant, file, "", body);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }
}
