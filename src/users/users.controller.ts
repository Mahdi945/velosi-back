import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  UsersService,
  CreateClientDto,
  CreatePersonnelDto,
  UpdateClientDto,
} from './users.service';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('clients')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  async createClient(@Body() createClientDto: CreateClientDto, @Request() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      console.log('📥 [createClient] Création client pour DB:', databaseName, 'Org:', organisationId);
      const client = await this.usersService.createClient(databaseName, organisationId, createClientDto);
      console.log('✅ [createClient] Client créé avec succès:', client.id, client.nom);
      console.log('📤 [createClient] Données retournées:', JSON.stringify(client, null, 2));
      
      return {
        success: true,
        message: 'Client créé avec succès',
        data: client, // Retourner toutes les données du client
      };
    } catch (error) {
      console.error('❌ [createClient] Erreur:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la création du client',
        error: error.message,
      };
    }
  }

  @Post('personnel')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'superviseur')
  async createPersonnel(@Body() createPersonnelDto: CreatePersonnelDto, @Request() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      const personnel = await this.usersService.createPersonnel(databaseName, organisationId, createPersonnelDto);
      return {
        success: true,
        message: 'Personnel créé avec succès',
        data: {
          id: personnel.id,
          nom: personnel.nom,
          prenom: personnel.prenom,
          nom_utilisateur: personnel.nom_utilisateur,
          role: personnel.role,
          email: personnel.email,
          telephone: personnel.telephone,
          created_at: personnel.created_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erreur lors de la création du personnel',
        error: error.message,
      };
    }
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial', 'client')
  async getAllClients(@Request() req) {
    try {
      console.log('🔍 [GET /users/clients] Requête reçue');
      console.log('👤 [GET /users/clients] Utilisateur:', req.user?.username);
      console.log('🏢 [GET /users/clients] Database:', req.user?.databaseName);
      console.log('🏛️ [GET /users/clients] Organisation:', req.user?.organisationId);
      console.log('📥 [GET /users/clients] Headers:', Object.keys(req.headers));
      console.log('🔐 [GET /users/clients] Authorization header:', req.headers.authorization ? 'Présent' : 'Absent');
      const clients = await this.usersService.getAllClients(req.user);
      console.log('✅ [GET /users/clients] Clients récupérés:', clients.length);
      return {
        success: true,
        message: 'Liste des clients récupérée avec succès',
        data: clients,
      };
    } catch (error) {
      console.error('❌ [GET /users/clients] Erreur lors de la récupération des clients:', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des clients',
        error: error.message,
        data: []
      };
    }
  }

  @Get('personnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial', 'client')
  async getAllPersonnel(@Request() req) {
    try {
      console.log('🔍 [GET /users/personnel] Requête reçue');
      console.log('👤 [GET /users/personnel] Utilisateur:', req.user?.username);
      console.log('🏢 [GET /users/personnel] Database (req.user):', req.user?.databaseName);
      console.log('🏛️ [GET /users/personnel] Organisation (req.user):', req.user?.organisationId);
      console.log('🏢 [GET /users/personnel] Database (interceptor):', req.organisationDatabase);
      console.log('🏛️ [GET /users/personnel] Organisation (interceptor):', req.organisationId);
      
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      const personnel = await this.usersService.getAllPersonnel(databaseName, organisationId);
      console.log('✅ [GET /users/personnel] Personnel récupéré:', personnel.length);
      return {
        success: true,
        message: 'Liste du personnel récupérée avec succès',
        data: personnel,
      };
    } catch (error) {
      console.error('❌ [GET /users/personnel] Erreur lors de la récupération du personnel:', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération du personnel',
        error: error.message,
      };
    }
  }

  @Get('personnel/commerciaux')
  @UseGuards(JwtAuthGuard)
  async getCommerciaux(@Request() req) {
    try {
      console.log('🔍 [GET /users/personnel/commerciaux] Requête reçue');
      console.log('👤 [GET /users/personnel/commerciaux] Utilisateur:', req.user?.username);
      console.log('🏢 [GET /users/personnel/commerciaux] Database (req.user):', req.user?.databaseName);
      console.log('🏛️ [GET /users/personnel/commerciaux] Organisation (req.user):', req.user?.organisationId);
      console.log('🏢 [GET /users/personnel/commerciaux] Database (interceptor):', req.organisationDatabase);
      console.log('🏛️ [GET /users/personnel/commerciaux] Organisation (interceptor):', req.organisationId);
      
      // Récupérer le databaseName depuis les helpers multi-tenant
      const databaseName = getDatabaseName(req);
      
      const personnel = await this.usersService.getPersonnelByRole(
        ['commercial', 'Commercial', 'COMMERCIAL', 'sales'],
        databaseName
      );
      
      console.log(`✅ [GET /users/personnel/commerciaux] ${personnel.length} commerciaux trouvés`);
      
      // Ne retourner que les informations nécessaires (pas de données sensibles)
      const commerciaux = personnel.map(p => ({
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        nom_utilisateur: p.nom_utilisateur,
        role: p.role
      }));

      return {
        success: true,
        message: 'Liste des commerciaux récupérée avec succès',
        data: commerciaux,
      };
    } catch (error) {
      console.error('❌ [GET /users/personnel/commerciaux] Erreur:', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des commerciaux',
        error: error.message,
      };
    }
  }

  @Get('clients/me')
  @UseGuards(JwtAuthGuard)
  async getMyClientData(@Request() req: any) {
    try {
      const currentUser = req.user;
      console.log('👤 [getMyClientData] Utilisateur courant:', currentUser);
      
      if (currentUser.userType !== 'client') {
        return {
          success: false,
          message: 'Accès refusé - endpoint réservé aux clients',
          data: null
        };
      }

      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      const client = await this.usersService.getClientById(databaseName, organisationId, currentUser.id);
      const clientData = await this.usersService.getClientWithContactData(databaseName, organisationId, currentUser.id);
      
      console.log('📋 [getMyClientData] Données client récupérées:', {
        id: clientData?.id,
        nom: clientData?.nom,
        charge_com: clientData?.charge_com
      });

      return {
        success: true,
        message: 'Données client récupérées avec succès',
        data: clientData,
      };
    } catch (error) {
      console.error('❌ [getMyClientData] Erreur:', error);
      return {
        success: false,
        message: 'Erreur lors de la récupération des données client',
        error: error.message,
        data: null
      };
    }
  }

  @Get('clients/:id')
  @UseGuards(JwtAuthGuard)
  async getClientById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      console.log('👤 [getClientById] DB:', databaseName, 'Org:', organisationId, 'ID:', id);
      const client = await this.usersService.getClientById(databaseName, organisationId, id);
      return {
        success: true,
        message: 'Client récupéré avec succès',
        data: client,
      };
    } catch (error) {
      console.error('❌ [getClientById] Erreur:', error);
      return {
        success: false,
        message: error.message || 'Client introuvable',
        data: null,
      };
    }
  }

  @Put('clients/:id')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  async updateClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
    @Request() req: any
  ) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      console.log('🔄 [updateClient] DB:', databaseName, 'Org:', organisationId);
      console.log('🔄 [updateClient] ID client à modifier:', id);
      
      const client = await this.usersService.updateClient(databaseName, organisationId, id, updateClientDto);
      return {
        success: true,
        message: 'Client modifié avec succès',
        data: client,
      };
    } catch (error) {
      console.error('❌ [updateClient] Erreur:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la modification du client',
        error: error.message,
      };
    }
  }

  @Get('personnel/:id')
  @UseGuards(JwtAuthGuard)
  async getPersonnelById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      console.log('👤 [getPersonnelById] DB:', databaseName, 'Org:', organisationId, 'ID:', id);
      const personnel = await this.usersService.getPersonnelById(databaseName, organisationId, id);
      return {
        success: true,
        message: 'Personnel récupéré avec succès',
        data: personnel,
      };
    } catch (error) {
      console.error('❌ [getPersonnelById] Erreur:', error);
      return {
        success: false,
        message: error.message || 'Personnel introuvable',
        data: null,
      };
    }
  }

  @Put('personnel/:id')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif') // Seuls les administratifs peuvent modifier
  async updatePersonnel(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePersonnelDto: Partial<CreatePersonnelDto>,
    @Request() req: any // Ajouter l'objet request pour accéder à l'utilisateur connecté
  ) {
    try {
      const currentUser = req.user;
      console.log('Utilisateur connecté:', currentUser);
      console.log('ID à modifier:', id);
      
      // Vérifier si l'utilisateur peut modifier ce personnel
      const canModify = 
        currentUser.role?.toLowerCase() === 'administratif' || 
        currentUser.role?.toLowerCase() === 'admin' ||
        currentUser.id === id; // Ou si c'est son propre profil
      
      if (!canModify) {
        return {
          success: false,
          message: 'Vous n\'êtes pas autorisé à modifier ce personnel',
          error: 'Accès refusé'
        };
      }
      
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      const personnel = await this.usersService.updatePersonnel(databaseName, organisationId, id, updatePersonnelDto);
      return {
        success: true,
        message: 'Personnel modifié avec succès',
        data: personnel,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erreur lors de la modification du personnel',
        error: error.message,
      };
    }
  }

  @Post('clients/:id/block')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async blockClient(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.usersService.blockClient(databaseName, organisationId, id);
    return {
      message: 'Client bloqué avec succès',
    };
  }

  @Post('clients/:id/unblock')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async unblockClient(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.usersService.unblockClient(databaseName, organisationId, id);
    return {
      message: 'Client débloqué avec succès',
    };
  }

  @Post('personnel/:id/deactivate')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async deactivatePersonnel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Request() req: any
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.usersService.deactivatePersonnel(databaseName, organisationId, id, body.reason);
    return {
      message: 'Personnel désactivé avec succès',
      success: true
    };
  }

  @Post('personnel/:id/suspend')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async suspendPersonnel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Request() req: any
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.usersService.suspendPersonnel(databaseName, organisationId, id, body.reason);
    return {
      message: 'Personnel suspendu avec succès',
      success: true
    };
  }

  @Post('personnel/:id/activate')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async activatePersonnel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.usersService.activatePersonnel(databaseName, organisationId, id);
    return {
      message: 'Personnel activé avec succès',
      success: true
    };
  }

  @Post('personnel/:id/reactivate')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async reactivatePersonnel(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.usersService.reactivatePersonnel(databaseName, organisationId, id);
    return {
      message: 'Personnel réactivé avec succès',
      success: true
    };
  }

  @Put('personnel/:id/password')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async updatePersonnelPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newPassword: string },
    @Request() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.usersService.updatePersonnelPassword(databaseName, organisationId, id, body.newPassword);
    return {
      message: 'Mot de passe mis à jour avec succès',
      success: true
    };
  }

  @Get('personnel/:id/activity')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  async getPersonnelActivity(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      console.log(`🔍 [getPersonnelActivity] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
      return await this.usersService.getPersonnelActivity(databaseName, organisationId, id);
    } catch (error) {
      console.error(`❌ [getPersonnelActivity] Erreur pour personnel ${id}:`, error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la récupération de l\'activité',
        data: [],
      };
    }
  }

  @Get('personnel/:id/sessions')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  async getPersonnelSessions(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      console.log(`🔍 [getPersonnelSessions] DB: ${databaseName}, Org: ${organisationId}, Personnel ID: ${id}`);
      return await this.usersService.getPersonnelSessions(databaseName, organisationId, id);
    } catch (error) {
      console.error(`❌ [getPersonnelSessions] Erreur pour personnel ${id}:`, error);
      return {
        success: false,
        message: error.message || 'Erreur lors de la récupération des sessions',
        sessions: [],
      };
    }
  }

  @Post('personnel/:id/logout-all')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async logoutAllPersonnelSessions(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    return await this.usersService.logoutAllPersonnelSessions(databaseName, organisationId, id);
  }

  @Delete('personnel/:id')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin') // Seuls les administrateurs peuvent supprimer
  @HttpCode(HttpStatus.OK)
  async deletePersonnel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Request() req: any
  ) {
    try {
      const databaseName = getDatabaseName(req);
      const organisationId = getOrganisationId(req);
      await this.usersService.deletePersonnel(databaseName, organisationId, id, body.reason);
      return {
        success: true,
        message: 'Personnel supprimé avec succès'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erreur lors de la suppression du personnel',
        error: error.message,
      };
    }
  }

  @Post('clients/:id/deactivate')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  @HttpCode(HttpStatus.OK)
  async deactivateClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { statut: string; motif: string; notifyByEmail: boolean },
    @Request() req: any
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.usersService.deactivateClient(databaseName, organisationId, id, body.statut, body.motif, body.notifyByEmail);
    return {
      message: `Client ${body.statut === 'desactive' ? 'désactivé' : 'suspendu'} avec succès`,
      success: true
    };
  }

  @Post('clients/:id/reactivate')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  @HttpCode(HttpStatus.OK)
  async reactivateClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { notifyByEmail: boolean },
    @Request() req: any
  ) {
    const databaseName = getDatabaseName(req);
    const organisationId = getOrganisationId(req);
    await this.usersService.reactivateClient(databaseName, organisationId, id, body.notifyByEmail);
    return {
      message: 'Client réactivé avec succès',
      success: true
    };
  }
}
