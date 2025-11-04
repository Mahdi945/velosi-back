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

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('clients')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  async createClient(@Body() createClientDto: CreateClientDto) {
    const client = await this.usersService.createClient(createClientDto);
    return {
      message: 'Client créé avec succès',
      client: {
        id: client.id,
        nom: client.nom,
        interlocuteur: client.interlocuteur,
        adresse: client.adresse,
        ville: client.ville,
        pays: client.pays,
        created_at: client.created_at,
      },
    };
  }

  @Post('personnel')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  async createPersonnel(@Body() createPersonnelDto: CreatePersonnelDto) {
    try {
      const personnel = await this.usersService.createPersonnel(createPersonnelDto);
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
  async getAllPersonnel() {
    try {
      console.log('🔍 [GET /users/personnel] Requête reçue');
      const personnel = await this.usersService.getAllPersonnel();
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
  async getCommerciaux() {
    try {
      // Endpoint public pour récupérer la liste des commerciaux
      // Utile pour les listes déroulantes dans les formulaires
      const personnel = await this.usersService.getPersonnelByRole(['commercial', 'Commercial', 'COMMERCIAL', 'sales']);
      
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

      const client = await this.usersService.getClientById(currentUser.id);
      const clientData = await this.usersService.getClientWithContactData(currentUser.id);
      
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
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  async getClientById(@Param('id', ParseIntPipe) id: number) {
    const client = await this.usersService.getClientById(id);
    return {
      message: 'Client récupéré avec succès',
      client,
    };
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
      const currentUser = req.user;
      console.log('🔄 [updateClient] Utilisateur connecté:', currentUser);
      console.log('🔄 [updateClient] ID client à modifier:', id);
      
      const client = await this.usersService.updateClient(id, updateClientDto);
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
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  async getPersonnelById(@Param('id', ParseIntPipe) id: number) {
    const personnel = await this.usersService.getPersonnelById(id);
    return {
      message: 'Personnel récupéré avec succès',
      personnel,
    };
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
      
      const personnel = await this.usersService.updatePersonnel(id, updatePersonnelDto);
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
  async blockClient(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.blockClient(id);
    return {
      message: 'Client bloqué avec succès',
    };
  }

  @Post('clients/:id/unblock')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async unblockClient(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.unblockClient(id);
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
    @Body() body: { reason?: string }
  ) {
    await this.usersService.deactivatePersonnel(id, body.reason);
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
    @Body() body: { reason?: string }
  ) {
    await this.usersService.suspendPersonnel(id, body.reason);
    return {
      message: 'Personnel suspendu avec succès',
      success: true
    };
  }

  @Post('personnel/:id/activate')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async activatePersonnel(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.activatePersonnel(id);
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
    @Param('id', ParseIntPipe) id: number
  ) {
    await this.usersService.reactivatePersonnel(id);
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
    @Body() body: { newPassword: string }
  ) {
    await this.usersService.updatePersonnelPassword(id, body.newPassword);
    return {
      message: 'Mot de passe mis à jour avec succès',
      success: true
    };
  }

  @Get('personnel/:id/activity')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  async getPersonnelActivity(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.getPersonnelActivity(id);
  }

  @Get('personnel/:id/sessions')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  async getPersonnelSessions(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.getPersonnelSessions(id);
  }

  @Post('personnel/:id/logout-all')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async logoutAllPersonnelSessions(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.logoutAllPersonnelSessions(id);
  }

  @Delete('personnel/:id')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin') // Seuls les administrateurs peuvent supprimer
  @HttpCode(HttpStatus.OK)
  async deletePersonnel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string }
  ) {
    try {
      await this.usersService.deletePersonnel(id, body.reason);
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
    @Body() body: { statut: string; motif: string; notifyByEmail: boolean }
  ) {
    await this.usersService.deactivateClient(id, body.statut, body.motif, body.notifyByEmail);
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
    @Body() body: { notifyByEmail: boolean }
  ) {
    await this.usersService.reactivateClient(id, body.notifyByEmail);
    return {
      message: 'Client réactivé avec succès',
      success: true
    };
  }
}
