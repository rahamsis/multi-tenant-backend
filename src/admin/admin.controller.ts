import { Body, Controller, Get, HttpStatus, Post, Put, Query, Res, Req, Headers } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags } from '@nestjs/swagger';
import { Response, } from 'express';

@ApiTags('Admin')
@Controller()
export class AdminController {
  constructor(private readonly appService: AdminService) { }

  @Get('/all-products')
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
}
