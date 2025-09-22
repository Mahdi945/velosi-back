const path = require('path');
const fs = require('fs');

console.log('=== Test complet du service email avec logo ===');

// Simuler la méthode getCompanyLogoBase64
function getCompanyLogoBase64() {
    try {
        const logoPath = path.join(process.cwd(), 'assets', 'logo_societee.png');
        console.log(`Tentative de chargement du logo depuis: ${logoPath}`);
        
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const logoBase64 = logoBuffer.toString('base64');
            console.log(`✅ Logo chargé avec succès (${logoBuffer.length} bytes)`);
            return `data:image/png;base64,${logoBase64}`;
        } else {
            console.log(`❌ Logo non trouvé à l'emplacement: ${logoPath}`);
            
            // Essayer avec un chemin alternatif depuis dist
            const distPath = path.join(__dirname, '../../../assets', 'logo_societee.png');
            console.log(`Tentative depuis dist: ${distPath}`);
            
            if (fs.existsSync(distPath)) {
                const logoBuffer = fs.readFileSync(distPath);
                const logoBase64 = logoBuffer.toString('base64');
                console.log(`✅ Logo chargé depuis dist (${logoBuffer.length} bytes)`);
                return `data:image/png;base64,${logoBase64}`;
            }
            
            return '';
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement du logo:', error);
        return '';
    }
}

// Test de génération du HTML avec logo
function testEmailTemplate() {
    const logoBase64 = getCompanyLogoBase64();
    
    if (logoBase64) {
        console.log('\n📧 Génération du template email...');
        const imgTag = `<img src="${logoBase64}" alt="Logo Velosi" class="logo" style="width: 200px !important; height: auto !important; max-height: 100px !important; display: block !important; margin: 0 auto 20px auto !important; border-radius: 8px; border: 2px solid #ffffff; background-color: #ffffff; padding: 8px;" />`;
        
        console.log('✅ Template généré avec succès');
        console.log(`📏 Taille de l'image tag: ${imgTag.length} caractères`);
        console.log(`🔗 Data URI length: ${logoBase64.length} caractères`);
        
        // Sauvegarder un exemple de template
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head><title>Test Logo Email</title></head>
<body>
    <div style="text-align: center; background: #5e72e4; padding: 30px;">
        ${imgTag}
        <h1 style="color: white;">Test Logo Velosi</h1>
    </div>
</body>
</html>`;
        
        fs.writeFileSync('test-email-template.html', htmlTemplate);
        console.log('📄 Template sauvé dans: test-email-template.html');
        console.log('🌐 Ouvrez ce fichier dans un navigateur pour voir le rendu');
        
    } else {
        console.log('❌ Impossible de générer le template - logo non trouvé');
    }
}

testEmailTemplate();