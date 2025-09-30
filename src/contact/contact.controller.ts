import { Controller, Post, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { EmailService } from '../services/email.service';

interface ContactDto {
  firstName: string;
  lastName: string;
  phone?: string;  // Optional phone
  email: string;
  enquiryType: string;
  message: string;
}

@Controller('contact')
export class ContactController {
  constructor(private emailService: EmailService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendContactForm(@Body() contactData: ContactDto) {
    try {
      // Utiliser la méthode sendContactEmail avec le même template et logo que les autres emails
      await this.emailService.sendContactEmail(contactData);

      return {
        success: true,
        message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.'
      };

    } catch (error) {
      console.error('Erreur lors de l\'envoi du message de contact:', error);
      return {
        success: false,
        message: 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.'
      };
    }
  }
}
