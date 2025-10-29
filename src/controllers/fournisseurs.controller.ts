import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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

@Controller('fournisseurs')
export class FournisseursController {
  constructor(private readonly fournisseursService: FournisseursService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createFournisseurDto: CreateFournisseurDto) {
    return this.fournisseursService.create(createFournisseurDto);
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
  ) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    const logoUrl = `/uploads/logos_fournisseurs/${file.filename}`;
    return this.fournisseursService.updateLogo(id, logoUrl);
  }

  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('ville') ville?: string,
    @Query('pays') pays?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.fournisseursService.findAll(
      Number(page),
      Number(limit),
      search,
      ville,
      pays,
      isActiveBoolean,
    );
  }

  @Get('stats')
  getStats() {
    return this.fournisseursService.getStats();
  }

  @Get('villes')
  getVilles() {
    return this.fournisseursService.getVilles();
  }

  @Get('pays')
  getPays() {
    return this.fournisseursService.getPays();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fournisseursService.findOne(id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.fournisseursService.findByCode(code);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFournisseurDto: UpdateFournisseurDto,
  ) {
    return this.fournisseursService.update(id, updateFournisseurDto);
  }

  @Put(':id/toggle-active')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.fournisseursService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fournisseursService.remove(id);
  }
}
