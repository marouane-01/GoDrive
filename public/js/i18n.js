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
            'home.hero.eyebrow': 'Application mobile · iOS & Android',
            'home.hero.title_html':
                '<span class="hero-heading__line">Envoyez n’importe où,</span><span class="hero-heading__line"><span class="text-gradient-hero">suivez en temps réel</span></span>',
            'home.hero.lead':
                'Go Drive est l’application mobile qui connecte expéditeurs et livreurs partout au Maroc. Livraison, ambulance, dépannage : publiez une demande en quelques secondes depuis l’app.',
            'home.hero.cta1': 'Obtenir l’app — c’est gratuit',
            'home.hero.cta2': 'Voir l’app en action',
            'home.hero.cta_hint': 'Gratuit · iOS & Android · prêt en 30 sec',
            'home.hero.rating': '4,9 sur 1 200+ avis',
            'home.hero.app_only_chip': 'Services accessibles uniquement dans l’app',
            'home.hero.trust_bar': '★ 4,9/5 · 50 000+ utilisateurs · Support 24/7',
            'home.hero.stat1': 'trajets dans l’app',
            'home.hero.stat2': 'code partagé client–livreur',
            'home.hero.stat3': 'suivi en temps réel',
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
            'about.eyebrow': 'Notre histoire',
            'about.hero.title_html': '<span class="hero-heading__line">L’app marocaine</span><span class="hero-heading__line">pour <span class="text-gradient-hero">bouger plus vite</span></span>',
            'about.hero.lead':
                'Une application mobile pour vos colis, vos urgences et vos imprévus — où que vous soyez au Maroc.',
            'about.banner.alt':
                'Bannière Go Drive : remise d’un colis à un livreur, avantages du service et aperçu du suivi de livraison dans l’application.',
            'about.banner.caption':
                'Bannière Go Drive : livraison de confiance et suivi dans l’application',
            'pages.guide.title': 'Comment ça marche — Go Drive',
            'guide.eyebrow': 'Comment ça marche',
            'guide.hero.title': 'Comprenez Go Drive en quelques étapes simples',
            'guide.hero.title_html': '<span class="hero-heading__line">Comprenez Go Drive en</span><span class="hero-heading__line"><span class="text-gradient-hero">quelques étapes simples</span></span>',
            'guide.hero.lead': 'Tout se passe dans l’application mobile — rapide, clair et sécurisé.',
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
            'home.hero.eyebrow': 'Mobile app · iOS & Android',
            'home.hero.title_html':
                '<span class="hero-heading__line">Ship anywhere,</span><span class="hero-heading__line">track in <span class="text-gradient-hero">real time</span></span>',
            'home.hero.lead':
                'Go Drive is the mobile app connecting senders and drivers across Morocco. Delivery, ambulance, roadside help — post a request in seconds from the app.',
            'home.hero.cta1': 'Get the app — it’s free',
            'home.hero.cta2': 'See the app in action',
            'home.hero.cta_hint': 'Free · iOS & Android · ready in 30 sec',
            'home.hero.rating': '4.9 from 1,200+ reviews',
            'home.hero.app_only_chip': 'Services available only in the app',
            'home.hero.trust_bar': '★ 4.9/5 · 50,000+ users · 24/7 support',
            'home.hero.stat1': 'trips in the app',
            'home.hero.stat2': 'code shared client–driver',
            'home.hero.stat3': 'live tracking',
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
            'about.eyebrow': 'Our story',
            'about.hero.title_html': '<span class="hero-heading__line">The Moroccan app</span><span class="hero-heading__line">to <span class="text-gradient-hero">move faster</span></span>',
            'about.hero.lead':
                'A mobile app for your parcels, your emergencies and your everyday needs — wherever you are in Morocco.',
            'about.banner.alt':
                'Go Drive banner: parcel handoff to a courier, service highlights, and in-app delivery tracking preview.',
            'about.banner.caption': 'Go Drive banner: trusted delivery and in-app tracking',
            'pages.guide.title': 'How it works — Go Drive',
            'guide.eyebrow': 'How it works',
            'guide.hero.title': 'Understand Go Drive in a few simple steps',
            'guide.hero.title_html': '<span class="hero-heading__line">Understand Go Drive in</span><span class="hero-heading__line"><span class="text-gradient-hero">a few simple steps</span></span>',
            'guide.hero.lead': 'Everything happens inside the mobile app — fast, clear and secure.',
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
            'home.hero.eyebrow': 'تطبيق محمول · iOS و Android',
            'home.hero.title_html':
                '<span class="hero-heading__line">أرسل أينما شئت،</span><span class="hero-heading__line"><span class="text-gradient-hero">تتبّع في كل لحظة</span></span>',
            'home.hero.lead':
                'Go Drive تطبيق محمول يربط المرسلين بالسائقين في أنحاء المغرب. توصيل، إسعاف، مساعدة على الطريق — انشر طلبًا في ثوانِ من التطبيق.',
            'home.hero.cta1': 'احصل على التطبيق — مجانًا',
            'home.hero.cta2': 'شاهد التطبيق',
            'home.hero.cta_hint': 'مجاني · iOS و Android · جاهز في 30 ثانية',
            'home.hero.rating': '4.9 من 1200+ تقييم',
            'home.hero.app_only_chip': 'الخدمات متاحة فقط داخل التطبيق',
            'home.hero.trust_bar': '★ 4.9/5 · +50‌000 مستخدم · دعم 24/7',
            'home.hero.stat1': 'مسارات داخل التطبيق',
            'home.hero.stat2': 'رمز مشترك بين العميل والسائق',
            'home.hero.stat3': 'تتبع مباشر',
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
            'about.eyebrow': 'قصتنا',
            'about.hero.title_html': '<span class="hero-heading__line">التطبيق المغربي</span><span class="hero-heading__line">لـ<span class="text-gradient-hero">تنقّل أسرع</span></span>',
            'about.hero.lead': 'تطبيق جوال لطرودك، حالاتك الطارئة واحتياجاتك اليومية — أينما كنت في المغرب.',
            'about.banner.alt':
                'لافتة Go Drive: تسليم طرد إلى مندوب، مزايا الخدمة، ومعاينة لتتبع التوصيل داخل التطبيق.',
            'about.banner.caption': 'لافتة Go Drive: توصيل موثوق وتتبع داخل التطبيق',
            'pages.guide.title': 'كيف يعمل — Go Drive',
            'guide.eyebrow': 'كيف يعمل',
            'guide.hero.title': 'افهم Go Drive في خطوات بسيطة',
            'guide.hero.title_html': '<span class="hero-heading__line">افهم Go Drive في</span><span class="hero-heading__line"><span class="text-gradient-hero">خطوات بسيطة</span></span>',
            'guide.hero.lead': 'كل شيء يحدث داخل التطبيق الجوّال — سريع، واضح وآمن.',
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
