import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminMspCrudService } from './admin-msp-crud.service';
import { CreateAdminMspDto } from './dto/create-admin-msp.dto';
import { UpdateAdminMspDto } from './dto/update-admin-msp.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard';

@Controller('admin-msp/admins')
@UseGuards(AdminJwtAuthGuard)
export class AdminMspCrudController {
  constructor(private readonly adminMspCrudService: AdminMspCrudService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    const admins = await this.adminMspCrudService.findAll();
    console.log('📤 [Backend] Envoi de', admins.length, 'admins MSP');
    return admins;
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return await this.adminMspCrudService.getStats();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.adminMspCrudService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateAdminMspDto, @Request() req) {
    return await this.adminMspCrudService.create(createDto, req.user.id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAdminMspDto,
  ) {
    return await this.adminMspCrudService.update(id, updateDto);
  }

  @Put(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id', ParseIntPipe) id: number) {
    return await this.adminMspCrudService.activate(id);
  }

  @Put(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return await this.adminMspCrudService.deactivate(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return await this.adminMspCrudService.delete(id);
  }
}
