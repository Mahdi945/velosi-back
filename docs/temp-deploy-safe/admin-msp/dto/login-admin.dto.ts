import { IsNotEmpty, IsString } from 'class-validator';

export class LoginAdminDto {
  @IsNotEmpty({ message: 'Le nom d\'utilisateur est requis' })
  @IsString()
  nom_utilisateur: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString()
  mot_de_passe: string;
}
