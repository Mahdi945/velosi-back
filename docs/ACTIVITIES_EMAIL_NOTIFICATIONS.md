# 📧 Système de Notifications Email pour les Activités CRM

**Date:** 16 octobre 2025  
**Objectif:** Implémenter un système de notifications automatiques pour les activités CRM

---

## 🎯 OBJECTIFS DES NOTIFICATIONS

### Notifications Automatiques à Implémenter

1. **Confirmation de RDV au prospect** - Immédiatement après création
2. **Rappel au commercial** - J-1 avant l'activité
3. **Rappel au prospect/client** - J-1 avant l'activité
4. **Invitation aux participants** - Pour les meetings/presentations

---

## 📋 IMPLÉMENTATION BACKEND

### 1️⃣ Créer un Service d'Email

```typescript
// src/modules/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransporter({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendActivityConfirmation(activity: Activity, lead: Lead) {
    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to: lead.email,
      subject: `Confirmation de rendez-vous - ${activity.title}`,
      html: this.getConfirmationTemplate(activity, lead),
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendActivityReminder(activity: Activity, recipient: string, isCommercial: boolean) {
    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to: recipient,
      subject: `Rappel - Activité demain: ${activity.title}`,
      html: isCommercial 
        ? this.getCommercialReminderTemplate(activity)
        : this.getClientReminderTemplate(activity),
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendParticipantInvitation(activity: Activity, participant: ActivityParticipant) {
    if (!participant.email) return;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to: participant.email,
      subject: `Invitation - ${activity.title}`,
      html: this.getInvitationTemplate(activity, participant),
    };

    return this.transporter.sendMail(mailOptions);
  }

  private getConfirmationTemplate(activity: Activity, lead: Lead): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Confirmation de Rendez-vous</h2>
        <p>Bonjour ${lead.fullName},</p>
        <p>Nous confirmons votre rendez-vous avec nous :</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Type:</strong> ${this.getActivityTypeLabel(activity.type)}</p>
          <p><strong>Date:</strong> ${this.formatDate(activity.scheduledAt)}</p>
          ${activity.durationMinutes ? `<p><strong>Durée:</strong> ${activity.durationMinutes} minutes</p>` : ''}
          ${activity.location ? `<p><strong>Lieu:</strong> ${activity.location}</p>` : ''}
          ${activity.meetingLink ? `<p><strong>Lien:</strong> <a href="${activity.meetingLink}">Rejoindre la réunion</a></p>` : ''}
        </div>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>Cordialement,<br>L'équipe Velosi</p>
      </div>
    `;
  }

  private getCommercialReminderTemplate(activity: Activity): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF9800;">Rappel - Activité Demain</h2>
        <p>Bonjour,</p>
        <p>Vous avez une activité prévue demain :</p>
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Titre:</strong> ${activity.title}</p>
          <p><strong>Type:</strong> ${this.getActivityTypeLabel(activity.type)}</p>
          <p><strong>Date:</strong> ${this.formatDate(activity.scheduledAt)}</p>
          <p><strong>Priorité:</strong> ${this.getPriorityLabel(activity.priority)}</p>
          ${activity.description ? `<p><strong>Description:</strong> ${activity.description}</p>` : ''}
          ${activity.meetingLink ? `<p><strong>Lien:</strong> <a href="${activity.meetingLink}">Rejoindre</a></p>` : ''}
        </div>
        <p>N'oubliez pas de vous préparer !</p>
      </div>
    `;
  }

  private getClientReminderTemplate(activity: Activity): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Rappel - Rendez-vous Demain</h2>
        <p>Bonjour,</p>
        <p>Nous vous rappelons votre rendez-vous de demain :</p>
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Objet:</strong> ${activity.title}</p>
          <p><strong>Date:</strong> ${this.formatDate(activity.scheduledAt)}</p>
          ${activity.durationMinutes ? `<p><strong>Durée:</strong> ${activity.durationMinutes} minutes</p>` : ''}
          ${activity.location ? `<p><strong>Lieu:</strong> ${activity.location}</p>` : ''}
          ${activity.meetingLink ? `<p><strong>Lien:</strong> <a href="${activity.meetingLink}">Rejoindre la réunion</a></p>` : ''}
        </div>
        <p>À demain !</p>
        <p>Cordialement,<br>L'équipe Velosi</p>
      </div>
    `;
  }

  private getInvitationTemplate(activity: Activity, participant: ActivityParticipant): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9C27B0;">Invitation à une Réunion</h2>
        <p>Bonjour ${participant.fullName},</p>
        <p>Vous êtes invité(e) à participer à :</p>
        <div style="background-color: #f3e5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Titre:</strong> ${activity.title}</p>
          <p><strong>Date:</strong> ${this.formatDate(activity.scheduledAt)}</p>
          ${activity.durationMinutes ? `<p><strong>Durée:</strong> ${activity.durationMinutes} minutes</p>` : ''}
          ${activity.location ? `<p><strong>Lieu:</strong> ${activity.location}</p>` : ''}
          ${activity.meetingLink ? `<p><strong>Lien:</strong> <a href="${activity.meetingLink}">Rejoindre la réunion</a></p>` : ''}
          ${activity.description ? `<p><strong>Description:</strong> ${activity.description}</p>` : ''}
        </div>
        <p>Merci de confirmer votre présence.</p>
        <p>Cordialement,<br>L'équipe Velosi</p>
      </div>
    `;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getActivityTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      call: 'Appel téléphonique',
      email: 'Email',
      meeting: 'Réunion',
      task: 'Tâche',
      note: 'Note',
      appointment: 'Rendez-vous',
      follow_up: 'Suivi',
      presentation: 'Présentation',
      proposal: 'Proposition commerciale',
      negotiation: 'Négociation',
      visit: 'Visite',
      demo: 'Démonstration',
    };
    return labels[type] || type;
  }

  private getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: '🟢 Faible',
      medium: '🟡 Moyenne',
      high: '🟠 Élevée',
      urgent: '🔴 Urgente',
    };
    return labels[priority] || priority;
  }
}
```

---

### 2️⃣ Modifier le Service Activities pour Envoyer les Emails

```typescript
// src/crm/activities.service.ts
import { EmailService } from '../email/email.service';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    @InjectRepository(ActivityParticipant)
    private participantRepository: Repository<ActivityParticipant>,
    private emailService: EmailService, // ✅ Injecter EmailService
  ) {}

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    const { participants, ...activityData } = createActivityDto;

    // Créer l'activité
    const activity = this.activityRepository.create(activityData);
    const savedActivity = await this.activityRepository.save(activity);

    // Créer les participants si fournis
    if (participants && participants.length > 0) {
      const participantEntities = participants.map((p) =>
        this.participantRepository.create({
          ...p,
          activityId: savedActivity.id,
        }),
      );
      await this.participantRepository.save(participantEntities);

      // ✅ Envoyer invitations aux participants
      for (const participant of participantEntities) {
        if (participant.email) {
          try {
            await this.emailService.sendParticipantInvitation(savedActivity, participant);
          } catch (error) {
            console.error('Erreur envoi email participant:', error);
          }
        }
      }
    }

    // ✅ Envoyer confirmation au prospect si lié
    if (savedActivity.leadId) {
      const lead = await this.getLeadById(savedActivity.leadId);
      if (lead && lead.email) {
        try {
          await this.emailService.sendActivityConfirmation(savedActivity, lead);
        } catch (error) {
          console.error('Erreur envoi confirmation prospect:', error);
        }
      }
    }

    return this.findOne(savedActivity.id);
  }

  // Méthode helper pour récupérer le prospect
  private async getLeadById(leadId: number) {
    // À implémenter selon votre structure
    // Peut nécessiter l'injection du LeadService
    return null;
  }
}
```

---

### 3️⃣ Créer un Cron Job pour les Rappels J-1

```typescript
// src/cron/activity-reminders.cron.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Activity } from '../crm/entities/activity.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class ActivityRemindersCron {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    private emailService: EmailService,
  ) {}

  // Tous les jours à 9h00
  @Cron('0 9 * * *')
  async sendDailyReminders() {
    console.log('🔔 Envoi des rappels d\'activités J-1...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Trouver toutes les activités de demain
    const activitiesTomorrow = await this.activityRepository.find({
      where: {
        scheduledAt: Between(tomorrow, dayAfterTomorrow),
        status: 'scheduled',
      },
      relations: ['assignedToPersonnel', 'lead', 'opportunity'],
    });

    console.log(`📧 ${activitiesTomorrow.length} activités trouvées pour demain`);

    for (const activity of activitiesTomorrow) {
      try {
        // Envoyer rappel au commercial
        if (activity.assignedToPersonnel && activity.assignedToPersonnel.email) {
          await this.emailService.sendActivityReminder(
            activity,
            activity.assignedToPersonnel.email,
            true,
          );
          console.log(`✅ Rappel envoyé au commercial: ${activity.assignedToPersonnel.email}`);
        }

        // Envoyer rappel au prospect/client
        if (activity.lead && activity.lead.email) {
          await this.emailService.sendActivityReminder(
            activity,
            activity.lead.email,
            false,
          );
          console.log(`✅ Rappel envoyé au prospect: ${activity.lead.email}`);
        }
      } catch (error) {
        console.error(`❌ Erreur envoi rappel pour activité ${activity.id}:`, error);
      }
    }

    console.log('✅ Envoi des rappels terminé');
  }
}
```

---

## 📦 CONFIGURATION

### Variables d'Environnement (.env)

```env
# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
SMTP_FROM="Velosi ERP <no-reply@velosi.com>"
```

---

### Installation des Dépendances

```bash
npm install --save nodemailer @nestjs/schedule
npm install --save-dev @types/nodemailer
```

---

### Module Configuration

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailService } from './modules/email/email.service';
import { ActivityRemindersCron } from './cron/activity-reminders.cron';

@Module({
  imports: [
    ScheduleModule.forRoot(), // ✅ Activer les cron jobs
    // ... autres imports
  ],
  providers: [
    EmailService,
    ActivityRemindersCron,
    // ... autres providers
  ],
})
export class AppModule {}
```

---

## 🎯 RÉSUMÉ DES NOTIFICATIONS

| Notification | Déclencheur | Destinataire | Timing |
|--------------|-------------|--------------|--------|
| Confirmation RDV | Création activité avec prospect | Prospect | Immédiat |
| Invitation participant | Ajout participant | Participant | Immédiat |
| Rappel commercial | Activité demain | Commercial assigné | J-1 à 9h00 |
| Rappel prospect/client | Activité demain | Prospect/Client lié | J-1 à 9h00 |

---

## 📱 AMÉLIORATIONS FUTURES

1. **Personnalisation des templates** - Interface admin pour éditer les templates
2. **Calendrier iCal** - Joindre fichier .ics aux invitations
3. **SMS** - Ajouter notifications SMS via Twilio
4. **Notifications push** - Dans l'application web
5. **Réponses participants** - Lien accepter/refuser dans l'email
6. **Historique emails** - Logger tous les emails envoyés

---

## ✅ CHECKLIST D'IMPLÉMENTATION

- [ ] Installer nodemailer et @nestjs/schedule
- [ ] Créer EmailService
- [ ] Configurer SMTP dans .env
- [ ] Modifier ActivitiesService pour envoyer confirmations
- [ ] Créer ActivityRemindersCron
- [ ] Ajouter ScheduleModule dans AppModule
- [ ] Tester envoi emails manuellement
- [ ] Tester cron job
- [ ] Créer logs pour traçabilité
- [ ] Gérer erreurs SMTP gracieusement

---

**Note:** Pour Gmail, vous devrez créer un "Mot de passe d'application" dans les paramètres de sécurité de votre compte Google.
