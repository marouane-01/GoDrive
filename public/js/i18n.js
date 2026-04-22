(function () {
    const STORAGE_KEY = 'godrive-lang';

    const DICT = {
        fr: {
            'lang.label': 'Langue',
            'nav.home': 'Accueil',
            'nav.about': 'À propos',
            'nav.guide': 'Comment ça marche',
            'nav.contact': 'Contact',
            'nav.download': 'Télécharger l’app',
            'nav.menu_open': 'Ouvrir le menu',
            'nav.menu_close': 'Fermer le menu',
            'nav.aria': 'Navigation principale',
            'pages.home.title': 'Go Drive — Transport de colis, local & international',
            'pages.home.meta': 'Go Drive connecte expéditeurs et livreurs pour des envois équitables : même ville, inter-ville ou international.',
            'home.hero.eyebrow': 'Maroc & international',
            'home.hero.title_html':
                '<span class="hero-heading__line">Des <span class="text-gradient-hero">livraisons claires</span>,</span><span class="hero-heading__line">du prix à la <span class="text-gradient-hero">livraison</span></span>',
            'home.hero.lead':
                'Publiez une demande, choisissez un livreur et suivez chaque étape — local, inter-ville ou à l’étranger. Une plateforme simple pour vos colis et bagages.',
            'home.hero.cta1': 'Télécharger l’app',
            'home.hero.cta2': 'Comment ça marche',
            'home.hero.stat1': 'types de trajet',
            'home.hero.stat2': 'partage par scan',
            'home.hero.stat3': 'historique de statut',
            'home.panel.title': 'Une plateforme, plusieurs besoins',
            'home.panel.blurb':
                'Installez l’application pour commander ou livrer, avec statuts en temps réel et QR code pour partager la commande.',
            'home.panel.tag1': 'Local',
            'home.panel.tag2': 'Inter-ville',
            'home.panel.tag3': 'International',
            'home.panel.tag4': 'QR & commandes',
            'home.panel.carousel_aria': 'Étapes de la livraison en images',
            'home.panel.carousel_caption':
                'En images : rencontre client et livreur, trajet, remise du colis et confirmation.',
            'home.panel.step1': 'Étape 1',
            'home.panel.step2': 'Étape 2',
            'home.panel.step3': 'Étape 3',
            'home.panel.step4': 'Étape 4',
            'home.panel.img_alt1':
                'Client et livreur Go Drive se rencontrent près du fourgon, cartons au sol et ville en arrière-plan',
            'home.panel.img_alt2': 'Fourgon Go Drive sur la route vers la destination',
            'home.panel.img_alt3': 'Livreur remettant un colis au destinataire à la porte',
            'home.panel.img_alt4': 'Livraison confirmée, poignée de mains avec le client',
            'home.panel.dots_aria': 'Choisir une image',
            'home.panel.goto_slide_1': 'Aller à l’image 1',
            'home.panel.goto_slide_2': 'Aller à l’image 2',
            'home.panel.goto_slide_3': 'Aller à l’image 3',
            'home.panel.goto_slide_4': 'Aller à l’image 4',
            'home.services.title': 'Des offres pour chaque distance',
            'home.services.title_html':
                'Des offres pour <span class="text-gradient-accent">chaque distance</span>',
            'home.services.sub':
                'Du dernier kilomètre au long courrier, la même expérience : commande, acceptation, transit, livraison.',
            'pages.about.title': 'À propos — Go Drive',
            'about.hero.title': 'À propos de Go Drive',
            'about.hero.title_html': 'À propos de <span class="text-gradient-on-dark">Go Drive</span>',
            'about.hero.lead':
                'Une plateforme pensée comme les apps de mobilité : simple, lisible, centrée sur l’expéditeur et le livreur.',
            'about.banner.alt':
                'Bannière Go Drive : remise d’un colis à un livreur, avantages du service et aperçu du suivi de livraison dans l’application.',
            'about.banner.caption':
                'Bannière Go Drive : livraison de confiance et suivi dans l’application',
            'pages.guide.title': 'Comment ça marche — Go Drive',
            'guide.hero.title': 'Comment utiliser Go Drive',
            'guide.hero.title_html': 'Comment utiliser <span class="text-gradient-on-dark">Go Drive</span>',
            'guide.hero.lead': 'Quelques étapes, comme sur une app de course — ici pour vos colis.',
            'pages.contact.title': 'Contact & support — Go Drive',
            'contact.hero.title': 'Contact & support',
            'contact.hero.lead': 'Une question, un partenariat ou un retour : écrivez-nous.',
            'contact.card.title': 'Nous contacter',
            'contact.card.lead': 'Posez une question ou partagez votre avis.',
            'pages.download.title': 'Télécharger l’app — Go Drive',
            'download.hero.title': 'Télécharger Go Drive',
            'download.hero.lead':
                'Scannez le QR code ou ouvrez l’application depuis votre store.',
            'pages.dashboard.title': 'Tableau de bord — Go Drive',
            'dashboard.hero.title_html': '<span class="text-gradient-on-dark">Tableau</span> de bord',
            'dashboard.hero.lead': 'Gérez vos envois et suivez vos livraisons.',
        },
        en: {
            'lang.label': 'Language',
            'nav.home': 'Home',
            'nav.about': 'About',
            'nav.guide': 'How it works',
            'nav.contact': 'Contact',
            'nav.download': 'Download the app',
            'nav.menu_open': 'Open menu',
            'nav.menu_close': 'Close menu',
            'nav.aria': 'Main navigation',
            'pages.home.title': 'Go Drive — Parcel delivery, local & international',
            'pages.home.meta':
                'Go Drive connects senders and drivers for fair shipments: same city, intercity, or international.',
            'home.hero.eyebrow': 'Morocco & international',
            'home.hero.title_html':
                '<span class="hero-heading__line">Clear <span class="text-gradient-hero">deliveries</span>,</span><span class="hero-heading__line">from price to <span class="text-gradient-hero">delivery</span></span>',
            'home.hero.lead':
                'Post a request, choose a driver, and track every step — local, intercity, or abroad. One simple platform for your parcels and luggage.',
            'home.hero.cta1': 'Download the app',
            'home.hero.cta2': 'How it works',
            'home.hero.stat1': 'trip types',
            'home.hero.stat2': 'share via scan',
            'home.hero.stat3': 'status history',
            'home.panel.title': 'One platform, many needs',
            'home.panel.blurb':
                'Install the app to send or deliver, with live statuses and a QR code to share the order.',
            'home.panel.tag1': 'Local',
            'home.panel.tag2': 'Intercity',
            'home.panel.tag3': 'International',
            'home.panel.tag4': 'QR & orders',
            'home.panel.carousel_aria': 'Delivery steps in pictures',
            'home.panel.carousel_caption':
                'From the customer–driver meet-up to the route, doorstep handoff, and confirmation.',
            'home.panel.step1': 'Step 1',
            'home.panel.step2': 'Step 2',
            'home.panel.step3': 'Step 3',
            'home.panel.step4': 'Step 4',
            'home.panel.img_alt1':
                'Customer and Go Drive courier meet by the van with parcels stacked nearby and city towers behind',
            'home.panel.img_alt2': 'Go Drive van on the road to the destination',
            'home.panel.img_alt3': 'Courier handing a parcel to the recipient at the door',
            'home.panel.img_alt4': 'Delivery complete, handshake with the customer',
            'home.panel.dots_aria': 'Choose an image',
            'home.panel.goto_slide_1': 'Go to image 1',
            'home.panel.goto_slide_2': 'Go to image 2',
            'home.panel.goto_slide_3': 'Go to image 3',
            'home.panel.goto_slide_4': 'Go to image 4',
            'home.services.title': 'Offers for every distance',
            'home.services.title_html':
                'Offers for <span class="text-gradient-accent">every distance</span>',
            'home.services.sub':
                'From last mile to long haul, the same flow: order, acceptance, transit, delivery.',
            'pages.about.title': 'About — Go Drive',
            'about.hero.title': 'About Go Drive',
            'about.hero.title_html': 'About <span class="text-gradient-on-dark">Go Drive</span>',
            'about.hero.lead':
                'A platform built like mobility apps: simple, clear, focused on senders and drivers.',
            'about.banner.alt':
                'Go Drive banner: parcel handoff to a courier, service highlights, and in-app delivery tracking preview.',
            'about.banner.caption': 'Go Drive banner: trusted delivery and in-app tracking',
            'pages.guide.title': 'How it works — Go Drive',
            'guide.hero.title': 'How to use Go Drive',
            'guide.hero.title_html': 'How to use <span class="text-gradient-on-dark">Go Drive</span>',
            'guide.hero.lead': 'A few steps, like a ride-hailing app — here for your parcels.',
            'pages.contact.title': 'Contact & support — Go Drive',
            'contact.hero.title': 'Contact & support',
            'contact.hero.lead': 'Questions, partnerships, or feedback — write to us.',
            'contact.card.title': 'Contact us',
            'contact.card.lead': 'Ask a question or share your feedback.',
            'pages.download.title': 'Download the app — Go Drive',
            'download.hero.title': 'Download Go Drive',
            'download.hero.lead': 'Scan the QR code or open the app from your store.',
            'pages.dashboard.title': 'Dashboard — Go Drive',
            'dashboard.hero.title_html': '<span class="text-gradient-on-dark">Dashboard</span>',
            'dashboard.hero.lead': 'Manage your shipments and deliveries.',
        },
        ar: {
            'lang.label': 'اللغة',
            'nav.home': 'الرئيسية',
            'nav.about': 'من نحن',
            'nav.guide': 'كيف يعمل',
            'nav.contact': 'اتصل بنا',
            'nav.download': 'تحميل التطبيق',
            'nav.menu_open': 'فتح القائمة',
            'nav.menu_close': 'إغلاق القائمة',
            'nav.aria': 'التنقل الرئيسي',
            'pages.home.title': 'Go Drive — توصيل الطرود محليًا ودوليًا',
            'pages.home.meta':
                'Go Drive يربط المرسلين والسائقين لشحنات عادلة: داخل المدينة، بين المدن، أو دوليًا.',
            'home.hero.eyebrow': 'المغرب ودوليًا',
            'home.hero.title_html':
                '<span class="hero-heading__line"><span class="text-gradient-hero">توصيل</span> واضح،</span><span class="hero-heading__line">من السعر إلى <span class="text-gradient-hero">التسليم</span></span>',
            'home.hero.lead':
                'انشر طلبًا، اختر سائقًا، وتابع كل مرحلة — محليًا، بين المدن، أو في الخارج. منصة بسيطة لطرودك وأمتعتك.',
            'home.hero.cta1': 'تحميل التطبيق',
            'home.hero.cta2': 'كيف تعمل',
            'home.hero.stat1': 'أنواع المسار',
            'home.hero.stat2': 'مشاركة بالمسح',
            'home.hero.stat3': 'سجل الحالات',
            'home.panel.title': 'منصة واحدة، احتياجات متعددة',
            'home.panel.blurb':
                'ثبّت التطبيق للطلب أو التوصيل، مع حالات فورية ورمز QR لمشاركة الطلب.',
            'home.panel.tag1': 'محلي',
            'home.panel.tag2': 'بين المدن',
            'home.panel.tag3': 'دولي',
            'home.panel.tag4': 'QR والطلبات',
            'home.panel.carousel_aria': 'مراحل التوصيل بالصور',
            'home.panel.carousel_caption':
                'بالصور: لقاء العميل والسائق، المسار، تسليم الطرد، ثم التأكيد.',
            'home.panel.step1': 'الخطوة 1',
            'home.panel.step2': 'الخطوة 2',
            'home.panel.step3': 'الخطوة 3',
            'home.panel.step4': 'الخطوة 4',
            'home.panel.img_alt1':
                'عميل ومندوب Go Drive يلتقيان بجانب الشاحنة وطرود مكدّسة ومدينة في الخلفية',
            'home.panel.img_alt2': 'شاحنة Go Drive على الطريق نحو الوجهة',
            'home.panel.img_alt3': 'مندوب يسلّم طردًا للمستلم عند الباب',
            'home.panel.img_alt4': 'اكتمال التسليم ومصافحة مع العميل',
            'home.panel.dots_aria': 'اختر صورة',
            'home.panel.goto_slide_1': 'الانتقال إلى الصورة 1',
            'home.panel.goto_slide_2': 'الانتقال إلى الصورة 2',
            'home.panel.goto_slide_3': 'الانتقال إلى الصورة 3',
            'home.panel.goto_slide_4': 'الانتقال إلى الصورة 4',
            'home.services.title': 'عروض لكل مسافة',
            'home.services.title_html':
                'عروض لكل <span class="text-gradient-accent">مسافة</span>',
            'home.services.sub':
                'من آخر كيلومتر إلى المسافات الطويلة، نفس التجربة: طلب، قبول، نقل، تسليم.',
            'pages.about.title': 'من نحن — Go Drive',
            'about.hero.title': 'حول Go Drive',
            'about.hero.title_html': 'عن <span class="text-gradient-on-dark">Go Drive</span>',
            'about.hero.lead': 'منصة مصممة مثل تطبيقات التنقل: بسيطة، واضحة، تركز على المرسل والسائق.',
            'about.banner.alt':
                'لافتة Go Drive: تسليم طرد إلى مندوب، مزايا الخدمة، ومعاينة لتتبع التوصيل داخل التطبيق.',
            'about.banner.caption': 'لافتة Go Drive: توصيل موثوق وتتبع داخل التطبيق',
            'pages.guide.title': 'كيف يعمل — Go Drive',
            'guide.hero.title': 'كيف تستخدم Go Drive',
            'guide.hero.title_html': 'كيفية استخدام <span class="text-gradient-on-dark">Go Drive</span>',
            'guide.hero.lead': 'خطوات قليلة، مثل تطبيق النقل — هنا لطرودك.',
            'pages.contact.title': 'الاتصال والدعم — Go Drive',
            'contact.hero.title': 'الاتصال والدعم',
            'contact.hero.lead': 'سؤال، شراكة، أو ملاحظة — راسلنا.',
            'contact.card.title': 'اتصل بنا',
            'contact.card.lead': 'اطرح سؤالاً أو شاركنا رأيك.',
            'pages.download.title': 'تحميل التطبيق — Go Drive',
            'download.hero.title': 'حمّل Go Drive',
            'download.hero.lead': 'امسح رمز QR أو افتح التطبيق من متجرك.',
            'pages.dashboard.title': 'لوحة التحكم — Go Drive',
            'dashboard.hero.title_html': '<span class="text-gradient-on-dark">لوحة</span> التحكم',
            'dashboard.hero.lead': 'أدر شحناتك وتتبّع عمليات التوصيل.',
        },
    };

    function getLang() {
        try {
            const s = localStorage.getItem(STORAGE_KEY);
            if (s === 'en' || s === 'ar' || s === 'fr') return s;
        } catch {
            /* ignore */
        }
        return 'fr';
    }

    function setLang(code) {
        if (code !== 'en' && code !== 'ar' && code !== 'fr') return;
        try {
            localStorage.setItem(STORAGE_KEY, code);
        } catch {
            /* ignore */
        }
        apply();
        window.dispatchEvent(new CustomEvent('godrive:lang', { detail: { lang: code } }));
    }

    function t(key) {
        const lang = getLang();
        const table = DICT[lang] || DICT.fr;
        if (table[key] != null) return table[key];
        return DICT.fr[key] != null ? DICT.fr[key] : key;
    }

    function apply() {
        const lang = getLang();
        document.documentElement.lang = lang === 'ar' ? 'ar' : lang === 'en' ? 'en' : 'fr';
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        const pageKey = document.body && document.body.getAttribute('data-page');
        if (pageKey) {
            const titleKey = `pages.${pageKey}.title`;
            if (DICT[lang]?.[titleKey] || DICT.fr[titleKey]) {
                document.title = t(titleKey);
            }
        }

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && pageKey === 'home') {
            metaDesc.setAttribute('content', t('pages.home.meta'));
        }

        const langSel = document.getElementById('lang-select');
        if (langSel) {
            langSel.value = lang;
            langSel.setAttribute('aria-label', t('lang.label'));
        }

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = t(key);
        });

        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            if (!key) return;
            const html = t(key);
            if (html && html.indexOf('<') !== -1) el.innerHTML = html;
            else el.textContent = html;
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!key) return;
            el.setAttribute('placeholder', t(key));
        });

        document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria-label');
            if (!key) return;
            el.setAttribute('aria-label', t(key));
        });

        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            if (!key) return;
            el.setAttribute('title', t(key));
        });

        document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
            const key = el.getAttribute('data-i18n-alt');
            if (!key) return;
            el.setAttribute('alt', t(key));
        });

        document.querySelectorAll('.site-footer').forEach((f) => {
            f.setAttribute('lang', lang === 'ar' ? 'ar' : lang === 'en' ? 'en' : 'fr');
        });
    }

    function mergeDict(extra) {
        if (!extra || typeof extra !== 'object') return;
        for (const L of ['fr', 'en', 'ar']) {
            if (extra[L] && typeof extra[L] === 'object') {
                Object.assign(DICT[L], extra[L]);
            }
        }
    }

    function init() {
        apply();
        const sel = document.getElementById('lang-select');
        if (sel && !sel.dataset.i18nBound) {
            sel.dataset.i18nBound = '1';
            sel.addEventListener('change', () => setLang(sel.value));
        }
    }

    window.goDriveI18n = {
        DICT,
        getLang,
        setLang,
        t,
        apply,
        init,
        mergeDict,
    };
})();
