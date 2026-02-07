import { Body, Controller, Get, HttpStatus, Post, Put, Query, Res, Req, Headers } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';
import { Response, } from 'express';
import { BodyDto } from './dto/login.dto';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('/backendApi/menus')
  async getMenus(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.appService.getMenus(tenant);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Get('/backendApi/features-products')
  async getNewProduct(
    @Query('feature') feature: number,
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.appService.getNewProduct(tenant, feature);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Get('/backendApi/all-products')
  async getAllProduct(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.appService.getAllProduct(tenant);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }
  
  @Get('/backendApi/all-brands')
  async getAllBrands(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.appService.getAllBrands(tenant);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Get('/backendApi/product-by-category')
  async getProductByCategory(
    @Query('category') category: string,
    @Query('subcategory') subcategory: string | null,
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.appService.getProductByCategory(tenant, category, subcategory);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Get('/backendApi/all-banners')
  async getAllBanners(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.appService.getAllBanners(tenant);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  @Post('/backendApi/login')
  async login(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
    @Body() body: BodyDto,
  ) {
    try {
      const data = await this.appService.login(tenant, body);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }
}
