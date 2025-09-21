const path = require('path');
const fs = require('fs');

// Test simple d'affichage du logo
const logoPath = path.join(process.cwd(), 'assets', 'logo_societee.png');
const logoBuffer = fs.readFileSync(logoPath);
const logoBase64 = logoBuffer.toString('base64');
const dataUri = `data:image/png;base64,${logoBase64}`;

// Créer un HTML test très simple
const simpleHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Logo Simple</title>
</head>
<body>
    <h1>Test d'affichage du logo Velosi</h1>
    <p>Logo avec balise img simple :</p>
    <img src="${dataUri}" alt="Logo Velosi" width="200" height="auto" />
    <p>Si vous voyez le logo ci-dessus, alors il fonctionne !</p>
    
    <hr>
    <p>Informations techniques :</p>
    <ul>
        <li>Taille du fichier : ${logoBuffer.length} bytes</li>
        <li>Longueur base64 : ${logoBase64.length} caractères</li>
        <li>Longueur DataURI : ${dataUri.length} caractères</li>
        <li>Type MIME : data:image/png;base64</li>
    </ul>
</body>
</html>
`;

// Sauvegarder le test
fs.writeFileSync('test-logo-simple.html', simpleHtml);
console.log('✅ Fichier test créé : test-logo-simple.html');
console.log('🌐 Ouvrez ce fichier dans un navigateur pour vérifier l\'affichage du logo');
console.log('📊 Informations du logo :');
console.log(`   - Taille : ${logoBuffer.length} bytes`);
console.log(`   - Base64 : ${logoBase64.length} caractères`);
console.log(`   - DataURI : ${dataUri.length} caractères`);
console.log(`   - Préfixe : ${dataUri.substring(0, 50)}...`);