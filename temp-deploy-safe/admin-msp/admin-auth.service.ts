import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminMsp } from './entities/admin-msp.entity';
import { LoginAdminDto } from './dto/login-admin.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminMsp, 'shipnology')
    private adminMspRepository: Repository<AdminMsp>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginAdminDto) {
    const { nom_utilisateur, mot_de_passe } = loginDto;

    // Rechercher l'admin par nom d'utilisateur
    const admin = await this.adminMspRepository.findOne({
      where: { nom_utilisateur },
    });

    if (!admin) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Vérifier le statut
    if (admin.statut !== 'actif') {
      throw new UnauthorizedException('Compte désactivé ou suspendu');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(mot_de_passe, admin.mot_de_passe);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Mettre à jour la dernière connexion
    await this.adminMspRepository.update(admin.id, {
      derniere_connexion: new Date(),
    });

    // Générer le token JWT avec expiration 8h
    const payload = {
      sub: admin.id,
      nom_utilisateur: admin.nom_utilisateur,
      role: admin.role,
      type: 'admin_msp',
      iat: Math.floor(Date.now() / 1000), // Timestamp de création
      loginTime: Date.now(), // Timestamp de connexion pour vérification
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      expiresIn: 28800, // 8 heures en secondes
      loginTime: Date.now(),
      admin: {
        id: admin.id,
        nom: admin.nom,
        prenom: admin.prenom,
        email: admin.email,
        nom_utilisateur: admin.nom_utilisateur,
        role: admin.role,
      },
    };
  }

  async validateAdmin(adminId: number): Promise<AdminMsp> {
    const admin = await this.adminMspRepository.findOne({
      where: { id: adminId, statut: 'actif' },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin non trouvé ou inactif');
    }

    return admin;
  }

  async getProfile(adminId: number) {
    const admin = await this.adminMspRepository.findOne({
      where: { id: adminId },
      select: ['id', 'nom', 'prenom', 'email', 'nom_utilisateur', 'role', 'statut', 'derniere_connexion'],
    });

    if (!admin) {
      throw new UnauthorizedException('Admin non trouvé');
    }

    return admin;
  }
}
