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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FournisseursService } from '../services/fournisseurs.service';
import { CreateFournisseurDto } from '../dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from '../dto/update-fournisseur.dto';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('fournisseurs')
@UseGuards(JwtAuthGuard)
export class FournisseursController {
  constructor(private readonly fournisseursService: FournisseursService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createFournisseurDto: CreateFournisseurDto, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.fournisseursService.create(databaseName, createFournisseurDto);
  }

  @Post('upload-logo/:id')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos_fournisseurs',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `fournisseur-${req.params.id}-${uniqueSuffix}${ext}`);
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
    const logoUrl = `/uploads/logos_fournisseurs/${file.filename}`;
    return this.fournisseursService.updateLogo(databaseName, id, logoUrl);
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
    const databaseName = getDatabaseName(req);
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.fournisseursService.findAll(
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
    return this.fournisseursService.getStats(databaseName);
  }

  @Get('villes')
  getVilles(@Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.fournisseursService.getVilles(databaseName);
  }

  @Get('pays')
  getPays(@Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.fournisseursService.getPays(databaseName);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.fournisseursService.findOne(databaseName, id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.fournisseursService.findByCode(databaseName, code);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFournisseurDto: UpdateFournisseurDto,
    @Req() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    return this.fournisseursService.update(databaseName, id, updateFournisseurDto);
  }

  @Put(':id/toggle-active')
  toggleActive(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.fournisseursService.toggleActive(databaseName, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.fournisseursService.remove(databaseName, id);
  }
}
