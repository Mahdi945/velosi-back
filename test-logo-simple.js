const path = require('path');
const fs = require('fs');

console.log('=== Test de chargement du logo ===');

function testLogoLoading() {
    try {
        const logoPath = path.join(process.cwd(), 'assets', 'logo_societee.png');
        console.log(`Chemin du logo: ${logoPath}`);
        
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const logoBase64 = logoBuffer.toString('base64');
            console.log(`✅ Logo chargé avec succès (${logoBuffer.length} bytes)`);
            console.log(`📊 Base64 length: ${logoBase64.length}`);
            console.log(`🔍 Base64 prefix: ${logoBase64.substring(0, 50)}...`);
            
            const dataUri = `data:image/png;base64,${logoBase64}`;
            console.log(`📄 Data URI length: ${dataUri.length}`);
            
            return dataUri;
        } else {
            console.log(`❌ Logo non trouvé à l'emplacement: ${logoPath}`);
            return '';
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement du logo:', error);
        return '';
    }
}

const result = testLogoLoading();
console.log(`\n📝 Résultat: ${result ? 'Logo chargé avec succès' : 'Échec du chargement'}`);