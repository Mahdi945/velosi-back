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

  @Post('bulk-create')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Body('clients') clients: CreateClientDto[]): Promise<{
    success: boolean;
    message: string;
    data: {
      successCount: number;
      failedCount: number;
      createdClients: Client[];
      errors: Array<{ index: number; email: string; error: string }>;
    };
  }> {
    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      throw new BadRequestException('Le tableau de clients ne peut pas être vide');
    }

    if (clients.length > 1000) {
      throw new BadRequestException('Vous ne pouvez pas importer plus de 1000 clients à la fois');
    }

    const createdClients: Client[] = [];
    const errors: Array<{ index: number; email: string; error: string }> = [];

    for (let i = 0; i < clients.length; i++) {
      try {
        const client = await this.clientService.create(clients[i]);
        createdClients.push(client);
      } catch (error) {
        console.error(`Erreur lors de la création du client à l'index ${i}:`, error);
        errors.push({
          index: i + 2, // +2 car ligne 1 = en-têtes Excel, ligne 2 = premier client
          email: clients[i]?.['email'] || 'Email non fourni',
          error: error.message || 'Erreur inconnue'
        });
      }
    }

    return {
      success: errors.length === 0,
      message: `${createdClients.length} client(s) créé(s) avec succès${errors.length > 0 ? `, ${errors.length} échec(s)` : ''}`,
      data: {
        successCount: createdClients.length,
        failedCount: errors.length,
        createdClients,
        errors
      }
    };
  }

  @Get()
  async findAll(): Promise<any> {
    const clients = await this.clientService.findAll();
    
    // 🏦 Debug: Vérifier les données COMPLÈTES incluant infos bancaires ET fournisseur
    if (clients.length > 0) {
      console.log('🔍 CONTROLLER - Premier client (données complètes):', {
        id: clients[0].id,
        nom: clients[0].nom,
        is_permanent: clients[0].is_permanent,
        type_is_permanent: typeof clients[0].is_permanent,
        // 🆕 DEBUG: Vérifier les champs fournisseur
        is_fournisseur: clients[0].is_fournisseur,
        type_is_fournisseur: typeof clients[0].is_fournisseur,
        code_fournisseur: clients[0].code_fournisseur,
        has_is_fournisseur: 'is_fournisseur' in clients[0],
        has_code_fournisseur: 'code_fournisseur' in clients[0],
        // Infos bancaires
        banque: clients[0].banque,
        iban: clients[0].iban,
        rib: clients[0].rib,
        swift: clients[0].swift,
        bic: clients[0].bic,
        allFields: Object.keys(clients[0])
      });
      
      // 🆕 Compter combien de clients sont fournisseurs
      const fournisseursCount = clients.filter(c => c.is_fournisseur === true).length;
      console.log(`📊 CONTROLLER - Statistiques fournisseurs: ${fournisseursCount} clients sont également fournisseurs sur ${clients.length} clients`);
    }
    
    // ✅ CORRECTION: Retourner directement les clients SANS transformation
    // pour garantir que TOUS les champs (y compris infos bancaires et fournisseur) sont présents
    return clients;
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

  @Get('by-commercial/:commercialId')
  async findByCommercial(
    @Param('commercialId', ParseIntPipe) commercialId: number,
  ): Promise<Client[]> {
    return await this.clientService.findClientsByCommercial(commercialId);
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

  @Post(':id/convert-to-fournisseur')
  @HttpCode(HttpStatus.OK)
  async convertToFournisseur(
    @Param('id', ParseIntPipe) id: number
  ): Promise<{
    success: boolean;
    message: string;
    data: { client: Client; codeFournisseur: string };
  }> {
    try {
      const result = await this.clientService.convertToFournisseur(id);
      return {
        success: true,
        message: `Client converti en fournisseur avec succès. Code fournisseur: ${result.codeFournisseur}`,
        data: result
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/revoke-portal-access')
  @HttpCode(HttpStatus.OK)
  async revokePortalAccess(
    @Param('id', ParseIntPipe) id: number
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.clientService.revokePortalAccess(id);
      return {
        success: true,
        message: 'Accès au portail révoqué avec succès. Le client a été désinscrit du portail.'
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.clientService.remove(id);
  }
}