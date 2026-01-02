import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminMsp } from './entities/admin-msp.entity';
import { CreateAdminMspDto } from './dto/create-admin-msp.dto';
import { UpdateAdminMspDto } from './dto/update-admin-msp.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminMspCrudService {
  constructor(
    @InjectRepository(AdminMsp, 'shipnology')
    private adminMspRepository: Repository<AdminMsp>,
  ) {}

  async findAll() {
    console.log('🔍 [Service] Récupération de tous les admins MSP...');
    const admins = await this.adminMspRepository.find({
      select: ['id', 'nom', 'prenom', 'email', 'nom_utilisateur', 'role', 'statut', 'created_at', 'updated_at', 'derniere_connexion', 'notes'],
      order: { created_at: 'DESC' },
    });
    console.log('✅ [Service] Trouvé', admins.length, 'admin(s) MSP');
    return admins;
  }

  async findOne(id: number) {
    const admin = await this.adminMspRepository.findOne({
      where: { id },
      select: ['id', 'nom', 'prenom', 'email', 'nom_utilisateur', 'role', 'statut', 'created_at', 'updated_at', 'derniere_connexion', 'notes'],
    });

    if (!admin) {
      throw new NotFoundException(`Admin MSP #${id} non trouvé`);
    }

    return admin;
  }

  async create(createDto: CreateAdminMspDto, creatorId: number) {
    // Vérifier si l'email existe déjà
    const existingByEmail = await this.adminMspRepository.findOne({
      where: { email: createDto.email },
    });

    if (existingByEmail) {
      throw new ConflictException('Cet email existe déjà');
    }

    // Vérifier si le nom d'utilisateur existe déjà
    const existingByUsername = await this.adminMspRepository.findOne({
      where: { nom_utilisateur: createDto.nom_utilisateur },
    });

    if (existingByUsername) {
      throw new ConflictException('Ce nom d\'utilisateur existe déjà');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(createDto.mot_de_passe, 12);

    // Créer l'admin
    const admin = this.adminMspRepository.create({
      ...createDto,
      mot_de_passe: hashedPassword,
      statut: 'actif',
      created_by: creatorId,
    });

    const saved = await this.adminMspRepository.save(admin);

    // Retourner sans le mot de passe
    const { mot_de_passe, ...result } = saved;
    return result;
  }

  async update(id: number, updateDto: UpdateAdminMspDto) {
    const admin = await this.findOne(id);

    // Vérifier si l'email existe déjà (sauf pour l'admin courant)
    if (updateDto.email && updateDto.email !== admin.email) {
      const existingByEmail = await this.adminMspRepository.findOne({
        where: { email: updateDto.email },
      });

      if (existingByEmail) {
        throw new ConflictException('Cet email existe déjà');
      }
    }

    // Vérifier si le nom d'utilisateur existe déjà (sauf pour l'admin courant)
    if (updateDto.nom_utilisateur && updateDto.nom_utilisateur !== admin.nom_utilisateur) {
      const existingByUsername = await this.adminMspRepository.findOne({
        where: { nom_utilisateur: updateDto.nom_utilisateur },
      });

      if (existingByUsername) {
        throw new ConflictException('Ce nom d\'utilisateur existe déjà');
      }
    }

    // Si le mot de passe est fourni, le hasher
    if (updateDto.mot_de_passe) {
      updateDto.mot_de_passe = await bcrypt.hash(updateDto.mot_de_passe, 12);
    }

    // Mettre à jour
    await this.adminMspRepository.update(id, updateDto);

    // Retourner l'admin mis à jour sans le mot de passe
    return this.findOne(id);
  }

  async delete(id: number) {
    const admin = await this.findOne(id);

    // Empêcher la suppression si c'est le seul super_admin
    if (admin.role === 'super_admin') {
      const superAdminsCount = await this.adminMspRepository.count({
        where: { role: 'super_admin', statut: 'actif' },
      });

      if (superAdminsCount <= 1) {
        throw new ConflictException('Impossible de supprimer le seul super administrateur actif');
      }
    }

    await this.adminMspRepository.delete(id);

    return {
      success: true,
      message: `Admin MSP "${admin.prenom} ${admin.nom}" supprimé avec succès`,
    };
  }

  async activate(id: number) {
    const admin = await this.findOne(id);

    if (admin.statut === 'actif') {
      throw new ConflictException('Cet admin est déjà actif');
    }

    await this.adminMspRepository.update(id, { statut: 'actif' });
    return this.findOne(id);
  }

  async deactivate(id: number) {
    const admin = await this.findOne(id);

    if (admin.statut === 'inactif') {
      throw new ConflictException('Cet admin est déjà inactif');
    }

    // Empêcher la désactivation si c'est le seul super_admin actif
    if (admin.role === 'super_admin') {
      const activeSuperAdminsCount = await this.adminMspRepository.count({
        where: { role: 'super_admin', statut: 'actif' },
      });

      if (activeSuperAdminsCount <= 1) {
        throw new ConflictException('Impossible de désactiver le seul super administrateur actif');
      }
    }

    await this.adminMspRepository.update(id, { statut: 'inactif' });
    return this.findOne(id);
  }

  async getStats() {
    const total = await this.adminMspRepository.count();
    const actifs = await this.adminMspRepository.count({ where: { statut: 'actif' } });
    const inactifs = await this.adminMspRepository.count({ where: { statut: 'inactif' } });
    const suspendus = await this.adminMspRepository.count({ where: { statut: 'suspendu' } });

    return {
      total,
      actifs,
      inactifs,
      suspendus,
    };
  }
}
