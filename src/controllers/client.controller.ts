import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientService } from '../services/client.service';
import { CreateClientDto, UpdateClientDto } from '../dto/client.dto';
import { Client, EtatFiscal } from '../entities/client.entity';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  async create(@Body() createClientDto: CreateClientDto): Promise<Client> {
    return await this.clientService.create(createClientDto);
  }

  @Get()
  async findAll(): Promise<Client[]> {
    return await this.clientService.findAll();
  }

  @Get('stats/tva')
  async getTVAStats() {
    return await this.clientService.getClientsTVAStatus();
  }

  @Get('suspended')
  async getClientsWithSuspensions(): Promise<Client[]> {
    return await this.clientService.findClientsByAutorisationStatus(true);
  }

  @Get('expired-documents')
  async getClientsWithExpiredDocuments() {
    return await this.clientService.findClientsWithExpiredDocuments();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Client> {
    return await this.clientService.findOne(id);
  }

  // Route supprimée - utiliser findOne avec l'ID à la place

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<Client> {
    return await this.clientService.update(id, updateClientDto);
  }

  @Patch(':id/etat-fiscal')
  async updateEtatFiscal(
    @Param('id', ParseIntPipe) id: number,
    @Body('etat_fiscal') etatFiscal: EtatFiscal,
  ): Promise<Client> {
    if (!Object.values(EtatFiscal).includes(etatFiscal)) {
      throw new BadRequestException('État fiscal invalide');
    }
    return await this.clientService.updateEtatFiscal(id, etatFiscal);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Client> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Validation du type de fichier
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG, GIF ou WebP.');
    }

    // Validation de la taille (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Le fichier ne peut pas dépasser 5MB');
    }

    // Sauvegarder le fichier et mettre à jour le client
    const photoPath = `uploads/profiles/client-${id}-${Date.now()}-${file.originalname}`;
    
    // TODO: Implémenter la sauvegarde réelle du fichier
    // fs.writeFileSync(photoPath, file.buffer);

    return await this.clientService.updatePhoto(id, photoPath);
  }

  @Patch(':id/password')
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body('newPassword') newPassword: string,
  ): Promise<Client> {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 6 caractères');
    }
    return await this.clientService.changePassword(id, newPassword);
  }

  @Get(':id/validate-tva')
  async validateTVACoherence(@Param('id', ParseIntPipe) id: number) {
    return await this.clientService.validateClientTVACoherence(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.clientService.remove(id);
  }
}