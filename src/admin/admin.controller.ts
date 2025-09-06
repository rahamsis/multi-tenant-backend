import { Body, Controller, Get, HttpStatus, Post, Put, Query, Res, Req, Headers } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags } from '@nestjs/swagger';
import { Response, } from 'express';

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

  @Put('/update-status')
  async updateProduct(
    @Headers('x-tenant-id') tenant: string,
    @Res() res: Response,
    @Body() body: { idProduct: number, status: number }
  ) {
    try {
      const data = await this.adminService.updateStatus(tenant, body)
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }
}
