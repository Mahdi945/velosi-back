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
import { plainToClass, classToPlain } from 'class-transformer';
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
  async findAll(): Promise<any> {
    const clients = await this.clientService.findAll();
    
    // Debug: Vérifier les données avant transformation
    if (clients.length > 0) {
      console.log('🔍 CONTROLLER - Premier client avant transformation:', {
        id: clients[0].id,
        nom: clients[0].nom,
        is_permanent: clients[0].is_permanent,
        type: typeof clients[0].is_permanent,
        allFields: Object.keys(clients[0])
      });
    }
    
    // Utiliser class-transformer pour s'assurer que @Expose() est respecté
    const transformedClients = classToPlain(clients, { 
      excludeExtraneousValues: false,
      enableImplicitConversion: true 
    });
    
    // Debug: Vérifier les données après transformation
    if (transformedClients.length > 0) {
      console.log('🔍 CONTROLLER - Premier client après transformation:', {
        id: transformedClients[0].id,
        nom: transformedClients[0].nom,
        is_permanent: transformedClients[0].is_permanent,
        type: typeof transformedClients[0].is_permanent,
        allFields: Object.keys(transformedClients[0])
      });
    }
    
    return transformedClients;
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

  @Post(':id/make-permanent')
  @HttpCode(HttpStatus.OK)
  async makePermanent(@Param('id', ParseIntPipe) id: number) {
    const result = await this.clientService.makePermanent(id);
    return {
      success: result.success,
      message: result.message,
      data: result.keycloakUserId ? { keycloakUserId: result.keycloakUserId } : null
    };
  }

  @Get('debug/is-permanent')
  async debugIsPermanent(): Promise<any> {
    try {
      console.log('🔍 ENDPOINT debug/is-permanent appelé');
      
      // Test direct avec requête SQL brute
      const rawResults = await this.clientService.debugRawQuery();
      
      // Test avec le service normal
      const clients = await this.clientService.findAll();
      
      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          database: {
            columnExists: rawResults.tableStructure.length > 0,
            tableInfo: rawResults.tableStructure,
            rawClients: rawResults.rawClients,
            message: "Requête SQL directe sur la table client"
          },
          service: {
            totalClients: clients.length,
            firstThreeClients: clients.slice(0, 3).map(c => ({
              id: c.id,
              nom: c.nom,
              is_permanent: c.is_permanent,
              type: typeof c.is_permanent,
              hasProperty: 'is_permanent' in c,
              allKeys: Object.keys(c)
            })),
            distribution: {
              permanent: clients.filter(c => c.is_permanent === true).length,
              temporary: clients.filter(c => c.is_permanent === false).length,
              null: clients.filter(c => c.is_permanent === null).length,
              undefined: clients.filter(c => c.is_permanent === undefined).length
            }
          },
          diagnosis: {
            problemDetected: clients.every(c => c.is_permanent === false),
            recommendation: clients.every(c => c.is_permanent === false) ? 
              "Tous les clients sont temporaires - vérifier les données ou créer des clients permanents pour test" :
              "Distribution normale détectée"
          }
        }
      };
      
      console.log('📊 Résultat du diagnostic:', JSON.stringify(result, null, 2));
      return result;
      
    } catch (error) {
      console.error('❌ Erreur dans debugIsPermanent:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
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

  @Post('debug/force-permanent/:id')
  async forceClientPermanent(@Param('id', ParseIntPipe) id: number): Promise<any> {
    try {
      // Mettre à jour directement via une requête SQL brute pour contourner TypeORM
      const result = await this.clientService.forceUpdatePermanent(id);
      
      return {
        success: true,
        message: `Client ${id} forcé comme permanent`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.clientService.remove(id);
  }
}