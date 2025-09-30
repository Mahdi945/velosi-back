const { EmailService } = require('./dist/services/email.service');
const { ConfigService } = require('@nestjs/config');

// Test simple du service email
const configService = new ConfigService();
const emailService = new EmailService(configService);

// Test de la méthode privée via une simulation
console.log('Test du service email...');

// Créer une instance temporaire pour tester
const path = require('path');
const fs = require('fs');

function testGetCompanyLogoBase64() {
    try {
        const logoPath = path.join(process.cwd(), 'assets', 'logo_societe.png');
        console.log(`Tentative de chargement du logo depuis: ${logoPath}`);
        
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const logoBase64 = logoBuffer.toString('base64');
            console.log(`Logo chargé avec succès (${logoBuffer.length} bytes)`);
            console.log(`Base64 length: ${logoBase64.length}`);
            console.log(`Base64 prefix: ${logoBase64.substring(0, 50)}...`);
            return `data:image/png;base64,${logoBase64}`;
        } else {
            console.warn(`Logo non trouvé à l'emplacement: ${logoPath}`);
            return '';
        }
    } catch (error) {
        console.error('Erreur lors du chargement du logo:', error);
        return '';
    }
}

testGetCompanyLogoBase64();