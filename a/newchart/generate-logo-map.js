// Script để generate logo map từ thư mục images
// Chạy: node generate-logo-map.js

const fs = require('fs');
const path = require('path');

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    const map = {};
    
    files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.svg' || ext === '.png') {
            const name = path.basename(file, ext).toUpperCase();
            // Ưu tiên SVG hơn PNG
            if (!map[name] || ext === '.svg') {
                map[name] = file;
            }
        }
    });
    
    return map;
}

function generateLogoMaps() {
    const cryptoMap = scanDirectory('images/crypto');
    const providerMap = scanDirectory('images/provider');
    
    // Generate JavaScript code
    const code = `// Auto-generated logo map - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}

const LOGO_MAPS = {
    crypto: ${JSON.stringify(cryptoMap, null, 4)},
    
    provider: ${JSON.stringify(providerMap, null, 4)}
};

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LOGO_MAPS;
}
`;
    
    fs.writeFileSync('logo-maps.js', code);
    
    console.log('✅ Generated logo-maps.js');
    console.log(`📊 Crypto logos: ${Object.keys(cryptoMap).length}`);
    console.log(`📊 Provider logos: ${Object.keys(providerMap).length}`);
    
    // Generate summary
    const summary = {
        generated_at: new Date().toISOString(),
        crypto_count: Object.keys(cryptoMap).length,
        provider_count: Object.keys(providerMap).length,
        crypto_logos: Object.keys(cryptoMap).sort(),
        provider_logos: Object.keys(providerMap).sort()
    };
    
    fs.writeFileSync('logo-summary.json', JSON.stringify(summary, null, 2));
    console.log('✅ Generated logo-summary.json');
}

// Run
try {
    generateLogoMaps();
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
