import { Body, Controller, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { Response, } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(
        @Body() body: { email: string; password: string },
        @Req() req: any,
        @Res() res: Response
    ) {
        const tenantId = req.tenantId; // viene del tenant.middleware.ts
        if (!tenantId) {
            throw new UnauthorizedException('Tenant no proporcionado');
        }
        try {
            const data = await this.authService.login(body.email, body.password, tenantId);
            console.log("data a enviar: ", data)
            return res.status(HttpStatus.OK).json(data);
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
        }
    }
}