function getStoredUser() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/** Protège uniquement le tableau de bord (accès réservé à un jeton déjà présent, ex. tests). */
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = getStoredUser();
    const path = window.location.pathname || '';

    const needsAuth = path.endsWith('dashboard.html');

    if (needsAuth && !token) {
        window.location.replace('/download-app.html');
        return { token: null, user: null };
    }

    return { token, user };
}

function tNav(key) {
    return window.goDriveI18n ? window.goDriveI18n.t(key) : key;
}

function setupNav() {
    const nav = document.getElementById('nav-links');
    if (!nav) return;

    checkAuth();

    nav.setAttribute('aria-label', tNav('nav.aria'));
    nav.innerHTML = `
        <a href="/about.html">${tNav('nav.about')}</a>
        <a href="/guide.html">${tNav('nav.guide')}</a>
        <a href="/contact.html">${tNav('nav.contact')}</a>
        <a href="/index.html#download" class="btn btn-sm btn-primary">${tNav('nav.download')}</a>
    `;
}

function initNavMenu() {
    const btn = document.getElementById('nav-menu-btn');
    const panel = document.getElementById('site-menu-panel');
    const header = document.querySelector('.site-header');
    if (!btn || !panel || !header) return;

    function menuAria(open) {
        btn.setAttribute('aria-label', open ? tNav('nav.menu_close') : tNav('nav.menu_open'));
    }

    function setOpen(open) {
        panel.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuAria(open);
        header.classList.toggle('is-menu-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
    }

    function close() {
        setOpen(false);
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(panel.hidden);
    });

    document.addEventListener('click', (e) => {
        if (panel.hidden || header.contains(e.target)) return;
        close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !panel.hidden) close();
    });

    panel.addEventListener('click', (e) => {
        if (e.target.closest('a')) close();
    });

    window.addEventListener('godrive:lang', () => {
        menuAria(!panel.hidden);
    });

    menuAria(!panel.hidden);
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initScrollReveal() {
    const nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;

    if (prefersReducedMotion()) {
        nodes.forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const obs = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const delay = el.getAttribute('data-reveal-delay');
                if (delay !== null && delay !== '') {
                    el.style.setProperty('--reveal-delay', `${delay}ms`);
                }
                el.classList.add('is-visible');
                obs.unobserve(el);
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    nodes.forEach((el) => obs.observe(el));
}

function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const onScroll = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 16);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
}

const CONTACT_MAX_FILES = 3;
const CONTACT_MAX_BYTES = 10 * 1024 * 1024;

/** Drapeau Unicode à partir du code ISO 3166-1 alpha-2 (ex. MA → 🇲🇦). */
function countryToFlagEmoji(iso2) {
    const c = String(iso2).toUpperCase();
    if (c.length !== 2) return '';
    const base = 0x1f1e6;
    try {
        return String.fromCodePoint(base + c.charCodeAt(0) - 65, base + c.charCodeAt(1) - 65);
    } catch {
        return '';
    }
}

/** Indicatifs E.164 (sans +) — noms en français pour le tri. */
const PHONE_COUNTRIES = [
    { iso: 'MA', dial: '212', name: 'Maroc' },
    { iso: 'DZ', dial: '213', name: 'Algérie' },
    { iso: 'TN', dial: '216', name: 'Tunisie' },
    { iso: 'LY', dial: '218', name: 'Libye' },
    { iso: 'EG', dial: '20', name: 'Égypte' },
    { iso: 'SD', dial: '249', name: 'Soudan' },
    { iso: 'MR', dial: '222', name: 'Mauritanie' },
    { iso: 'SN', dial: '221', name: 'Sénégal' },
    { iso: 'GM', dial: '220', name: 'Gambie' },
    { iso: 'ML', dial: '223', name: 'Mali' },
    { iso: 'GN', dial: '224', name: 'Guinée' },
    { iso: 'CI', dial: '225', name: "Côte d'Ivoire" },
    { iso: 'BF', dial: '226', name: 'Burkina Faso' },
    { iso: 'NE', dial: '227', name: 'Niger' },
    { iso: 'TG', dial: '228', name: 'Togo' },
    { iso: 'BJ', dial: '229', name: 'Bénin' },
    { iso: 'MU', dial: '230', name: 'Maurice' },
    { iso: 'LR', dial: '231', name: 'Liberia' },
    { iso: 'SL', dial: '232', name: 'Sierra Leone' },
    { iso: 'GH', dial: '233', name: 'Ghana' },
    { iso: 'NG', dial: '234', name: 'Nigeria' },
    { iso: 'TD', dial: '235', name: 'Tchad' },
    { iso: 'CF', dial: '236', name: 'Centrafrique' },
    { iso: 'CM', dial: '237', name: 'Cameroun' },
    { iso: 'CV', dial: '238', name: 'Cap-Vert' },
    { iso: 'ST', dial: '239', name: 'São Tomé-et-Príncipe' },
    { iso: 'GA', dial: '241', name: 'Gabon' },
    { iso: 'CG', dial: '242', name: 'Congo' },
    { iso: 'CD', dial: '243', name: 'RD Congo' },
    { iso: 'AO', dial: '244', name: 'Angola' },
    { iso: 'RE', dial: '262', name: 'La Réunion' },
    { iso: 'YT', dial: '262', name: 'Mayotte' },
    { iso: 'ZA', dial: '27', name: 'Afrique du Sud' },
    { iso: 'FR', dial: '33', name: 'France' },
    { iso: 'BE', dial: '32', name: 'Belgique' },
    { iso: 'CH', dial: '41', name: 'Suisse' },
    { iso: 'LU', dial: '352', name: 'Luxembourg' },
    { iso: 'MC', dial: '377', name: 'Monaco' },
    { iso: 'DE', dial: '49', name: 'Allemagne' },
    { iso: 'AT', dial: '43', name: 'Autriche' },
    { iso: 'IT', dial: '39', name: 'Italie' },
    { iso: 'ES', dial: '34', name: 'Espagne' },
    { iso: 'PT', dial: '351', name: 'Portugal' },
    { iso: 'NL', dial: '31', name: 'Pays-Bas' },
    { iso: 'GB', dial: '44', name: 'Royaume-Uni' },
    { iso: 'IE', dial: '353', name: 'Irlande' },
    { iso: 'SE', dial: '46', name: 'Suède' },
    { iso: 'NO', dial: '47', name: 'Norvège' },
    { iso: 'DK', dial: '45', name: 'Danemark' },
    { iso: 'FI', dial: '358', name: 'Finlande' },
    { iso: 'PL', dial: '48', name: 'Pologne' },
    { iso: 'CZ', dial: '420', name: 'Tchéquie' },
    { iso: 'SK', dial: '421', name: 'Slovaquie' },
    { iso: 'HU', dial: '36', name: 'Hongrie' },
    { iso: 'RO', dial: '40', name: 'Roumanie' },
    { iso: 'BG', dial: '359', name: 'Bulgarie' },
    { iso: 'GR', dial: '30', name: 'Grèce' },
    { iso: 'HR', dial: '385', name: 'Croatie' },
    { iso: 'SI', dial: '386', name: 'Slovénie' },
    { iso: 'RS', dial: '381', name: 'Serbie' },
    { iso: 'BA', dial: '387', name: 'Bosnie-Herzégovine' },
    { iso: 'AL', dial: '355', name: 'Albanie' },
    { iso: 'MK', dial: '389', name: 'Macédoine du Nord' },
    { iso: 'TR', dial: '90', name: 'Turquie' },
    { iso: 'RU', dial: '7', name: 'Russie' },
    { iso: 'UA', dial: '380', name: 'Ukraine' },
    { iso: 'SA', dial: '966', name: 'Arabie saoudite' },
    { iso: 'AE', dial: '971', name: 'Émirats arabes unis' },
    { iso: 'QA', dial: '974', name: 'Qatar' },
    { iso: 'KW', dial: '965', name: 'Koweït' },
    { iso: 'BH', dial: '973', name: 'Bahreïn' },
    { iso: 'OM', dial: '968', name: 'Oman' },
    { iso: 'JO', dial: '962', name: 'Jordanie' },
    { iso: 'LB', dial: '961', name: 'Liban' },
    { iso: 'IL', dial: '972', name: 'Israël' },
    { iso: 'PS', dial: '970', name: 'Palestine' },
    { iso: 'IQ', dial: '964', name: 'Irak' },
    { iso: 'IR', dial: '98', name: 'Iran' },
    { iso: 'US', dial: '1', name: 'États-Unis' },
    { iso: 'CA', dial: '1', name: 'Canada' },
    { iso: 'MX', dial: '52', name: 'Mexique' },
    { iso: 'BR', dial: '55', name: 'Brésil' },
    { iso: 'AR', dial: '54', name: 'Argentine' },
    { iso: 'CL', dial: '56', name: 'Chili' },
    { iso: 'CO', dial: '57', name: 'Colombie' },
    { iso: 'PE', dial: '51', name: 'Pérou' },
    { iso: 'IN', dial: '91', name: 'Inde' },
    { iso: 'CN', dial: '86', name: 'Chine' },
    { iso: 'JP', dial: '81', name: 'Japon' },
    { iso: 'KR', dial: '82', name: 'Corée du Sud' },
    { iso: 'AU', dial: '61', name: 'Australie' },
    { iso: 'NZ', dial: '64', name: 'Nouvelle-Zélande' },
];

function normalizePhoneSearch(s) {
    return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getVisiblePhoneOptions(listEl) {
    return Array.from(listEl.querySelectorAll('.phone-country-option')).filter((btn) => {
        const li = btn.closest('li');
        return li && !li.hidden;
    });
}

/** Sélecteur pays/indicatif (drapeaux, recherche, clavier, état vide). */
function initPhoneCountryField() {
    const wrap = document.querySelector('[data-phone-country]');
    if (!wrap) return;

    const hidden = document.getElementById('contact-phone-prefix');
    const btn = document.getElementById('phone-country-btn');
    const panel = document.getElementById('contact-phone-panel');
    const search = document.getElementById('contact-phone-search');
    const list = document.getElementById('contact-phone-list');
    const emptyEl = document.getElementById('contact-phone-empty');
    const flagEl = document.getElementById('contact-phone-flag');
    const dialLabel = document.getElementById('contact-phone-dial-label');
    const phoneInput = document.getElementById('contact-phone');

    if (!hidden || !btn || !panel || !list || !flagEl || !dialLabel) return;

    const contactCard = wrap.closest('.contact-card');

    const rows = [...PHONE_COUNTRIES];
    rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const maIdx = rows.findIndex((r) => r.iso === 'MA');
    if (maIdx > -1) {
        const [ma] = rows.splice(maIdx, 1);
        rows.unshift(ma);
    }

    function updateSelectionClasses() {
        const v = hidden.value;
        list.querySelectorAll('.phone-country-option').forEach((optBtn) => {
            const sel = optBtn.dataset.value === v;
            optBtn.classList.toggle('is-selected', sel);
            optBtn.setAttribute('aria-selected', sel ? 'true' : 'false');
        });
    }

    function syncUI(valueStr) {
        const parts = String(valueStr).split('|');
        const iso = parts[0];
        const dial = parts[1];
        if (!iso || dial === undefined) return;
        hidden.value = `${iso}|${dial}`;
        flagEl.textContent = countryToFlagEmoji(iso);
        dialLabel.textContent = `+${dial}`;
        updateSelectionClasses();
    }

    function updateEmptyState() {
        if (!emptyEl) return;
        const n = getVisiblePhoneOptions(list).length;
        emptyEl.hidden = n > 0;
    }

    function scrollSelectedIntoView() {
        const sel = list.querySelector('.phone-country-option.is-selected');
        if (!sel || sel.closest('li')?.hidden) return;
        requestAnimationFrame(() => sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    }

    function filterList(q) {
        const nq = normalizePhoneSearch(q.trim());
        list.querySelectorAll('.phone-country-option').forEach((optBtn) => {
            const hay = normalizePhoneSearch(optBtn.dataset.search || '');
            const li = optBtn.closest('li');
            if (li) li.hidden = Boolean(nq) && !hay.includes(nq);
        });
        updateEmptyState();
    }

    function closePanel() {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        wrap.classList.remove('phone-country--open');
        contactCard?.classList.remove('contact-card--phone-open');
    }

    function openPanel() {
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        wrap.classList.add('phone-country--open');
        contactCard?.classList.add('contact-card--phone-open');
        if (search) {
            search.value = '';
            filterList('');
            search.focus();
        }
        requestAnimationFrame(() => {
            scrollSelectedIntoView();
            panel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    }

    list.innerHTML = '';
    for (const row of rows) {
        const val = `${row.iso}|${row.dial}`;
        const flag = countryToFlagEmoji(row.iso);
        const li = document.createElement('li');
        li.className = 'phone-country-item';
        li.setAttribute('role', 'none');

        const optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.className = 'phone-country-option';
        optBtn.setAttribute('role', 'option');
        optBtn.tabIndex = -1;
        optBtn.id = `phone-opt-${row.iso}`;
        optBtn.dataset.value = val;
        optBtn.dataset.search = `${row.name} ${row.iso} +${row.dial} ${row.dial}`;

        const spanF = document.createElement('span');
        spanF.className = 'phone-country-option__flag';
        spanF.setAttribute('aria-hidden', 'true');
        spanF.textContent = flag;

        const spanN = document.createElement('span');
        spanN.className = 'phone-country-option__name';
        spanN.textContent = row.name;

        const spanD = document.createElement('span');
        spanD.className = 'phone-country-option__dial';
        spanD.textContent = `+${row.dial}`;

        optBtn.append(spanF, spanN, spanD);
        optBtn.addEventListener('click', (e) => {
            e.preventDefault();
            syncUI(val);
            closePanel();
            phoneInput?.focus();
        });

        li.appendChild(optBtn);
        list.appendChild(li);
    }

    list.addEventListener('keydown', (e) => {
        const t = e.target;
        if (!t.classList?.contains('phone-country-option')) return;
        const vis = getVisiblePhoneOptions(list);
        const idx = vis.indexOf(t);
        if (idx < 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (idx < vis.length - 1) vis[idx + 1].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (idx > 0) vis[idx - 1].focus();
            else search?.focus();
        } else if (e.key === 'Home') {
            e.preventDefault();
            if (vis.length) vis[0].focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            if (vis.length) vis[vis.length - 1].focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const val = t.dataset.value;
            if (val) {
                syncUI(val);
                closePanel();
                phoneInput?.focus();
            }
        }
    });

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!panel.hidden) closePanel();
        else openPanel();
    });

    search?.addEventListener('input', () => filterList(search.value));

    search?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const vis = getVisiblePhoneOptions(list);
            if (vis.length === 1) {
                const val = vis[0].dataset.value;
                if (val) {
                    syncUI(val);
                    closePanel();
                    phoneInput?.focus();
                }
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const vis = getVisiblePhoneOptions(list);
            if (vis.length) vis[0].focus();
            return;
        }
        if (e.key === 'Escape') {
            e.stopPropagation();
            closePanel();
            btn.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) closePanel();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || panel.hidden) return;
        e.preventDefault();
        closePanel();
        btn.focus();
    });

    /* Fermé au chargement : uniquement ouverture au clic sur le bouton indicatif. */
    closePanel();
    syncUI(hidden.value || 'MA|212');

    const form = document.getElementById('contact-form');
    form?.addEventListener('reset', () => {
        requestAnimationFrame(() => {
            syncUI('MA|212');
            closePanel();
        });
    });
}

/** Contact form: maps `<select name="service">` values → i18n keys for placeholders, hints, templates. */
const GD_CONTACT_SERVICE_PROFILES = {
    colis: {
        subjectKey: 'contact.ph.subject.colis',
        hintKey: 'contact.service.hint.colis',
        templateKey: 'contact.template.colis',
    },
    ambulance: {
        subjectKey: 'contact.ph.subject.ambulance',
        hintKey: 'contact.service.hint.ambulance',
        templateKey: 'contact.template.ambulance',
    },
    depannage: {
        subjectKey: 'contact.ph.subject.depannage',
        hintKey: 'contact.service.hint.depannage',
        templateKey: 'contact.template.depannage',
    },
};

const GD_CONTACT_SERVICE_FALLBACK = {
    subjectKey: 'contact.ph.subject',
    hintKey: 'contact.service.hint',
    templateKey: '',
};

function getContactServiceProfile(service) {
    return GD_CONTACT_SERVICE_PROFILES[service] || GD_CONTACT_SERVICE_FALLBACK;
}

function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    initPhoneCountryField();

    const subjectInput = document.getElementById('contact-subject');
    const serviceSelect = document.getElementById('contact-service');
    const serviceHintEl = form.querySelector('[data-i18n="contact.service.hint"]');
    const textarea = document.getElementById('contact-comment');
    const countEl = document.getElementById('contact-char-count');
    const fileInput = document.getElementById('contact-files');
    const fileList = document.getElementById('contact-file-list');
    const statusEl = document.getElementById('contact-form-status');

    let selectedFiles = [];
    let isApplyingAutoMessage = false;

    function syncTextareaCount() {
        if (!textarea || !countEl) return;
        countEl.textContent = String(textarea.value.length);
    }

    function applyServiceAwareContent() {
        const service = serviceSelect?.value || '';
        const profile = getContactServiceProfile(service);

        if (subjectInput) {
            const nextSubjectPlaceholder = tNav(profile.subjectKey);
            if (subjectInput.getAttribute('placeholder') !== nextSubjectPlaceholder) {
                subjectInput.setAttribute('placeholder', nextSubjectPlaceholder);
            }
        }

        if (serviceHintEl) {
            const nextHint = tNav(profile.hintKey);
            if (serviceHintEl.textContent !== nextHint) {
                serviceHintEl.textContent = nextHint;
            }
        }

        if (!textarea) return;

        const nextTemplate = profile.templateKey ? tNav(profile.templateKey) : '';
        const isAutoManaged = textarea.dataset.autoManaged === '1';
        const isEmpty = !textarea.value.trim();

        if (!nextTemplate) {
            if (isAutoManaged) {
                isApplyingAutoMessage = true;
                textarea.value = '';
                isApplyingAutoMessage = false;
                textarea.dataset.autoManaged = '0';
                textarea.dataset.autoTemplate = '';
                syncTextareaCount();
            }
            return;
        }

        if (!isEmpty && !isAutoManaged) return;

        if (textarea.value !== nextTemplate) {
            isApplyingAutoMessage = true;
            textarea.value = nextTemplate;
            isApplyingAutoMessage = false;
        }

        textarea.dataset.autoManaged = '1';
        textarea.dataset.autoTemplate = nextTemplate;
        syncTextareaCount();
    }

    function renderFileList() {
        if (!fileList) return;
        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            const name = document.createElement('span');
            name.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} Mo)`;
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = tNav('contact.file.remove');
            removeBtn.addEventListener('click', () => {
                selectedFiles.splice(index, 1);
                updateFileInput();
                renderFileList();
            });
            li.appendChild(name);
            li.appendChild(removeBtn);
            fileList.appendChild(li);
        });
    }

    function updateFileInput() {
        if (!fileInput) return;
        const dt = new DataTransfer();
        selectedFiles.forEach((f) => dt.items.add(f));
        fileInput.files = dt.files;
    }

    function addFilesFromInput(files) {
        const incoming = Array.from(files || []);
        let hadOversize = false;
        for (const file of incoming) {
            if (selectedFiles.length >= CONTACT_MAX_FILES) break;
            if (file.size > CONTACT_MAX_BYTES) {
                hadOversize = true;
                if (statusEl) {
                    statusEl.textContent = tNav('contact.file.oversize').replace('%s', file.name);
                    statusEl.className = 'contact-form-status is-error';
                }
                continue;
            }
            const dup = selectedFiles.some((f) => f.name === file.name && f.size === file.size);
            if (!dup) selectedFiles.push(file);
        }
        if (!hadOversize && statusEl) {
            statusEl.textContent = '';
            statusEl.className = 'contact-form-status';
        }
        updateFileInput();
        renderFileList();
    }

    syncTextareaCount();
    textarea?.addEventListener('input', () => {
        syncTextareaCount();
        if (isApplyingAutoMessage) return;

        const autoTemplate = textarea.dataset.autoTemplate || '';
        if (!textarea.value.trim()) {
            textarea.dataset.autoManaged = '0';
            textarea.dataset.autoTemplate = '';
            return;
        }

        if (textarea.value !== autoTemplate) {
            textarea.dataset.autoManaged = '0';
        }
    });

    serviceSelect?.addEventListener('change', applyServiceAwareContent);
    form.addEventListener('reset', () => {
        requestAnimationFrame(() => {
            if (textarea) {
                textarea.dataset.autoManaged = '0';
                textarea.dataset.autoTemplate = '';
            }
            applyServiceAwareContent();
            syncTextareaCount();
        });
    });

    applyServiceAwareContent();

    fileInput?.addEventListener('change', () => {
        if (!fileInput.files?.length) return;
        addFilesFromInput(fileInput.files);
        fileInput.value = '';
    });

    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.className = 'contact-form-status';
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const apiUrl = `${window.location.origin}/api/contact`;
        const fd = new FormData(form);
        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) {
            statusEl.textContent = tNav('contact.submitting');
            statusEl.className = 'contact-form-status';
        }

        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                body: fd,
                headers: { Accept: 'application/json' },
            });
            let data = {};
            try {
                data = await res.json();
            } catch {
                data = {};
            }

            if (res.ok && data.success) {
                if (statusEl) {
                    statusEl.textContent = tNav('contact.success');
                    statusEl.className = 'contact-form-status is-ok';
                }
                form.reset();
                selectedFiles = [];
                updateFileInput();
                renderFileList();
                syncTextareaCount();
                return;
            }

            const code = data.code || '';
            let msg = data.message || '';
            if (code === 'RATE_LIMIT' || res.status === 429) {
                msg = tNav('contact.error.rate');
            } else if (code === 'VALIDATION' || res.status === 400) {
                msg = tNav('contact.error.validation');
                if (Array.isArray(data.details) && data.details.length && data.details[0].message) {
                    msg = `${msg} (${data.details[0].message})`;
                }
            } else if (code === 'MAIL_CONFIG' || res.status === 503) {
                msg = tNav('contact.error.mail_config');
            } else if (!res.ok) {
                msg = msg || tNav('contact.error.server');
            } else {
                msg = tNav('contact.error.server');
            }

            if (statusEl) {
                statusEl.textContent = msg;
                statusEl.className = 'contact-form-status is-error';
            }
        } catch {
            if (statusEl) {
                statusEl.textContent = tNav('contact.error.network');
                statusEl.className = 'contact-form-status is-error';
            }
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    window.addEventListener('godrive:lang', () => {
        renderFileList();
        if (statusEl?.classList.contains('is-ok')) {
            statusEl.textContent = tNav('contact.success');
        }
        applyServiceAwareContent();
    });
}

function initFooterLangPill() {
    document.querySelectorAll('[data-footer-lang-pill]').forEach((btn) => {
        if (btn.dataset.footerLangBound) return;
        btn.dataset.footerLangBound = '1';
        btn.addEventListener('click', () => {
            const sel = document.getElementById('lang-select');
            if (!sel) return;
            sel.closest('header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            requestAnimationFrame(() => {
                sel.focus({ preventScroll: true });
            });
        });
    });
}

function initFooterMegaPromo() {
    const root = document.querySelector('[data-footer-promo]');
    if (!root) return;
    const slides = Array.from(root.querySelectorAll('[data-footer-slide]'));
    if (slides.length < 2) return;
    let idx = 0;

    function show(next) {
        idx = (next + slides.length) % slides.length;
        slides.forEach((el, j) => {
            const on = j === idx;
            el.classList.toggle('is-active', on);
            if (on) el.removeAttribute('hidden');
            else el.setAttribute('hidden', '');
        });
    }

    root.querySelector('[data-footer-promo-prev]')?.addEventListener('click', () => show(idx - 1));
    root.querySelector('[data-footer-promo-next]')?.addEventListener('click', () => show(idx + 1));
}

function initHeroPanelCarousel() {
    const root = document.querySelector('[data-hero-carousel]');
    if (!root) return;
    const slides = Array.from(root.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(root.querySelectorAll('[data-hero-carousel-dot]'));
    if (slides.length < 2) return;

    let idx = 0;
    let timer = null;
    const intervalMs = 4500;

    function show(next) {
        idx = (next + slides.length) % slides.length;
        slides.forEach((el, j) => {
            const on = j === idx;
            el.classList.toggle('is-active', on);
            if (on) el.removeAttribute('hidden');
            else el.setAttribute('hidden', '');
        });
        dots.forEach((d, j) => {
            const on = j === idx;
            d.classList.toggle('is-active', on);
            if (on) d.setAttribute('aria-current', 'true');
            else d.removeAttribute('aria-current');
        });
    }

    function stopAuto() {
        if (timer) window.clearInterval(timer);
        timer = null;
    }

    function startAuto() {
        stopAuto();
        if (prefersReducedMotion()) return;
        timer = window.setInterval(() => show(idx + 1), intervalMs);
    }

    dots.forEach((d) => {
        d.addEventListener('click', () => {
            const i = parseInt(d.getAttribute('data-hero-carousel-dot') || '0', 10);
            if (!Number.isNaN(i)) show(i);
            startAuto();
        });
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAuto();
        else startAuto();
    });

    show(0);
    startAuto();
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.goDriveI18n) window.goDriveI18n.init();
    setupNav();
    initNavMenu();
    window.addEventListener('godrive:lang', () => {
        setupNav();
    });
    initScrollReveal();
    initHeaderScroll();
    initContactForm();
    initFooterLangPill();
    initFooterMegaPromo();
    initHeroPanelCarousel();
});
