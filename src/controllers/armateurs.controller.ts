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

@Controller('armateurs')
export class ArmateursController {
  constructor(private readonly armateursService: ArmateursService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createArmateurDto: CreateArmateurDto) {
    return this.armateursService.create(createArmateurDto);
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
  ) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    const logoUrl = `/uploads/logos_armateurs/${file.filename}`;
    return this.armateursService.updateLogo(id, logoUrl);
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
    return this.armateursService.findAll(
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
    return this.armateursService.getStats();
  }

  @Get('villes')
  getVilles() {
    return this.armateursService.getVilles();
  }

  @Get('pays')
  getPays() {
    return this.armateursService.getPays();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.armateursService.findOne(id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.armateursService.findByCode(code);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateArmateurDto: UpdateArmateurDto,
  ) {
    return this.armateursService.update(id, updateArmateurDto);
  }

  @Put(':id/toggle-active')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.armateursService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.armateursService.remove(id);
  }
}
