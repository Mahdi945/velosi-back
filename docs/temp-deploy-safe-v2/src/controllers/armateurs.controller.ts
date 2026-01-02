import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ArmateursService } from '../services/armateurs.service';
import { CreateArmateurDto } from '../dto/create-armateur.dto';
import { UpdateArmateurDto } from '../dto/update-armateur.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';

@Controller('armateurs')
@UseGuards(JwtAuthGuard)
export class ArmateursController {
  constructor(private readonly armateursService: ArmateursService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createArmateurDto: CreateArmateurDto, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.armateursService.create(databaseName, createArmateurDto);
  }

  @Post('upload-logo/:id')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos_armateurs',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `armateur-${req.params.id}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
          return callback(new Error('Seules les images sont autorisées!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    const databaseName = getDatabaseName(req);
    const logoUrl = `/uploads/logos_armateurs/${file.filename}`;
    return this.armateursService.updateLogo(databaseName, id, logoUrl);
  }

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('ville') ville?: string,
    @Query('pays') pays?: string,
    @Query('isActive') isActive?: string,
    @Req() req: any = {},
  ) {
    console.log('🔍 [ARMATEURS] req.user:', req.user);
    const databaseName = getDatabaseName(req);
    console.log('📝 [ARMATEURS] Récupération des armateurs depuis:', databaseName);
    console.log('📋 [ARMATEURS] DB:', databaseName);
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.armateursService.findAll(
      databaseName,
      Number(page),
      Number(limit),
      search,
      ville,
      pays,
      isActiveBoolean,
    );
  }

  @Get('stats')
  getStats(@Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.armateursService.getStats(databaseName);
  }

  @Get('villes')
  getVilles(@Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.armateursService.getVilles(databaseName);
  }

  @Get('pays')
  getPays(@Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.armateursService.getPays(databaseName);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.armateursService.findOne(databaseName, id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.armateursService.findByCode(databaseName, code);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateArmateurDto: UpdateArmateurDto,
    @Req() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    return this.armateursService.update(databaseName, id, updateArmateurDto);
  }

  @Put(':id/toggle-active')
  toggleActive(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.armateursService.toggleActive(databaseName, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.armateursService.remove(databaseName, id);
  }
}
