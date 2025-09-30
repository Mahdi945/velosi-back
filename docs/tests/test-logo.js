const path = require('path');
const fs = require('fs');

console.log('=== Test du chemin du logo ===');
console.log('process.cwd():', process.cwd());
console.log('__dirname:', __dirname);

// Test chemin 1: avec __dirname
const rootPath = path.resolve(__dirname, './');
const logoPath1 = path.join(rootPath, 'assets', 'logo_societe.png');
console.log('\n1. Chemin avec __dirname:', logoPath1);
console.log('   Existe?', fs.existsSync(logoPath1));

// Test chemin 2: avec process.cwd()
const logoPath2 = path.join(process.cwd(), 'assets', 'logo_societe.png');
console.log('\n2. Chemin avec process.cwd():', logoPath2);
console.log('   Existe?', fs.existsSync(logoPath2));

if (fs.existsSync(logoPath2)) {
    const stats = fs.statSync(logoPath2);
    console.log('   Taille:', stats.size, 'bytes');
} else if (fs.existsSync(logoPath1)) {
    const stats = fs.statSync(logoPath1);
    console.log('   Taille:', stats.size, 'bytes');
}