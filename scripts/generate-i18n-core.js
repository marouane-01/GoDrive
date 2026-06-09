/**
 * Generates public/js/i18n-core.js from legacy embedded dictionary (one-time recovery).
 * After generation, edit public/js/i18n-core.js directly — do not rely on archive/legacy-i18n/.
 * Run: npm run i18n:core
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const LEGACY_I18N = path.join(ROOT, 'archive', 'legacy-i18n', 'i18n.js');
const OUT = path.join(ROOT, 'public', 'js', 'i18n-core.js');

const EXTRA = {
    fr: {
        'nav.aria_mobile': 'Menu mobile',
        'a11y.skip': 'Aller au contenu principal',
        'pages.about.meta':
            'Go Drive — l’application mobile marocaine pour vos colis, vos urgences et vos imprévus. Simple, rapide, à portée de poche.',
        'pages.guide.meta':
            'Comment utiliser l’app Go Drive : étapes simples pour les clients et les livreurs — commande, suivi en temps réel et QR sécurisé.',
        'pages.contact.meta':
            'Contactez l’équipe Go Drive : questions sur l’application mobile, support, partenariats. Réponse rapide en français, anglais ou arabe.',
        'pages.download.meta':
            'Téléchargez Go Drive gratuitement sur iOS et Android. Scannez le QR code ou ouvrez votre store pour accéder à tous les services.',
        'pages.dashboard.meta':
            'Aperçu de l’application mobile Go Drive : commandes, suivi et statuts. Toutes les actions se font uniquement depuis l’app.',
        'pages.dashboard.title': 'Aperçu de l’application — Go Drive',
    },
    en: {
        'nav.aria_mobile': 'Mobile menu',
        'a11y.skip': 'Skip to main content',
        'pages.about.meta':
            'Go Drive — the Moroccan mobile app for parcels, emergencies and roadside needs. Simple, fast, always in your pocket.',
        'pages.guide.meta':
            'How to use the Go Drive app: simple steps for customers and drivers — ordering, live tracking and secure QR codes.',
        'pages.contact.meta':
            'Contact the Go Drive team: questions about the mobile app, support, partnerships. Fast replies in French, English or Arabic.',
        'pages.download.meta':
            'Download Go Drive free on iOS and Android. Scan the QR code or open your store to access every service.',
        'pages.dashboard.meta':
            'Preview of the Go Drive mobile app: orders, tracking and statuses. All actions happen only inside the app.',
        'pages.dashboard.title': 'App preview — Go Drive',
    },
    ar: {
        'nav.aria_mobile': 'القائمة على الهاتف',
        'a11y.skip': 'انتقل إلى المحتوى الرئيسي',
        'pages.about.meta':
            'Go Drive — التطبيق المغربي لطرودك وحالات الطوارئ واحتياجاتك على الطريق. بسيط، سريع وفي متناول يدك.',
        'pages.guide.meta':
            'كيفية استخدام تطبيق Go Drive: خطوات بسيطة للعملاء والسائقين — الطلب، التتبع المباشر ورمز QR الآمن.',
        'pages.contact.meta':
            'تواصل مع فريق Go Drive: أسئلة حول التطبيق، الدعم والشراكات. رد سريع بالفرنسية أو الإنجليزية أو العربية.',
        'pages.download.meta':
            'حمّل Go Drive مجانًا على iOS وAndroid. امسح رمز QR أو افتح متجرك للوصول إلى جميع الخدمات.',
        'pages.dashboard.meta':
            'معاينة تطبيق Go Drive: الطلبات والتتبع والحالات. جميع الإجراءات تتم فقط من داخل التطبيق.',
        'pages.dashboard.title': 'معاينة التطبيق — Go Drive',
    },
};

function loadLegacyDict() {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(LEGACY_I18N, 'utf8'), sandbox);
    return sandbox.window.goDriveI18n.DICT;
}

function main() {
    const legacy = loadLegacyDict();
    const merged = { fr: {}, en: {}, ar: {} };

    for (const lang of ['fr', 'en', 'ar']) {
        Object.assign(merged[lang], legacy[lang] || {}, EXTRA[lang] || {});
    }

    const body = `/** Core UI translations (nav, pages meta, heroes) — merged into JSON bundles at build time */
(function () {
    if (!window.goDriveI18n || typeof window.goDriveI18n.mergeDict !== 'function') return;
    window.goDriveI18n.mergeDict(${JSON.stringify(merged, null, 4)});
})();
`;

    fs.writeFileSync(OUT, body);
    console.log(`Wrote ${path.relative(ROOT, OUT)}`);
    for (const lang of ['fr', 'en', 'ar']) {
        console.log(`  ${lang}: ${Object.keys(merged[lang]).length} keys`);
    }
}

main();
