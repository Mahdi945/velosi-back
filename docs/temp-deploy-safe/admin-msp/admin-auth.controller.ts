import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { LoginAdminDto } from './dto/login-admin.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard';

@Controller('admin-msp/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginAdminDto) {
    return await this.adminAuthService.login(loginDto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return await this.adminAuthService.getProfile(req.user.id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('logout')
  async logout() {
    return { message: 'Déconnexion réussie' };
  }
}
