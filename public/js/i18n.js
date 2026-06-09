(function () {
    const STORAGE_KEY = 'godrive-lang';
    const LANGS = ['fr', 'en', 'ar'];
    const I18N_BASE = '/js/i18n';

    const DICT = { fr: {}, en: {}, ar: {} };
    const loadedBundles = new Set();
    let initPromise = null;

    function getPageKey() {
        return (document.body && document.body.getAttribute('data-page')) || 'home';
    }

    function getLangFromUrl() {
        try {
            const lang = new URLSearchParams(window.location.search).get('lang');
            if (LANGS.includes(lang)) return lang;
        } catch {
            /* ignore */
        }
        return null;
    }

    function getLang() {
        const urlLang = getLangFromUrl();
        if (urlLang) return urlLang;

        try {
            const s = localStorage.getItem(STORAGE_KEY);
            if (LANGS.includes(s)) return s;
        } catch {
            /* ignore */
        }
        return 'fr';
    }

    function syncLangToUrl(code) {
        try {
            const url = new URL(window.location.href);
            if (code === 'fr') {
                url.searchParams.delete('lang');
            } else {
                url.searchParams.set('lang', code);
            }
            window.history.replaceState({}, '', url.toString());
        } catch {
            /* ignore */
        }
    }

    function bundlePath(lang, page) {
        return `${I18N_BASE}/${lang}/${page}.json`;
    }

    async function loadBundle(lang, page) {
        const id = `${lang}:${page}`;
        if (loadedBundles.has(id)) return;

        const res = await fetch(bundlePath(lang, page), { credentials: 'same-origin' });
        if (!res.ok) {
            throw new Error(`Failed to load i18n bundle ${lang}/${page} (${res.status})`);
        }

        const data = await res.json();
        Object.assign(DICT[lang], data);
        loadedBundles.add(id);
    }

    async function ensureTranslations(lang, page) {
        await Promise.all([loadBundle(lang, 'common'), loadBundle(lang, page)]);
    }

    async function setLang(code) {
        if (!LANGS.includes(code)) return;
        try {
            localStorage.setItem(STORAGE_KEY, code);
        } catch {
            /* ignore */
        }

        syncLangToUrl(code);
        await ensureTranslations(code, getPageKey());
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

        const pageKey = getPageKey();
        if (pageKey) {
            const titleKey = `pages.${pageKey}.title`;
            if (DICT[lang]?.[titleKey] || DICT.fr[titleKey]) {
                document.title = t(titleKey);
            }
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
        for (const L of LANGS) {
            if (extra[L] && typeof extra[L] === 'object') {
                Object.assign(DICT[L], extra[L]);
            }
        }
    }

    async function init() {
        if (!initPromise) {
            initPromise = (async () => {
                const lang = getLang();
                const page = getPageKey();
                if (getLangFromUrl()) {
                    try {
                        localStorage.setItem(STORAGE_KEY, lang);
                    } catch {
                        /* ignore */
                    }
                }
                syncLangToUrl(lang);
                await ensureTranslations(lang, page);
                apply();

                const sel = document.getElementById('lang-select');
                if (sel && !sel.dataset.i18nBound) {
                    sel.dataset.i18nBound = '1';
                    sel.addEventListener('change', () => {
                        void setLang(sel.value);
                    });
                }
            })();
        }
        return initPromise;
    }

    window.goDriveI18n = {
        DICT,
        getLang,
        setLang,
        t,
        apply,
        init,
        mergeDict,
        loadBundle,
        ensureTranslations,
    };
})();
