(function () {
    function ensureModal() {
        if (document.getElementById('download-qr-modal')) return;
        var wrap = document.createElement('div');
        wrap.id = 'download-qr-modal';
        wrap.className = 'download-qr-modal';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-labelledby', 'download-qr-modal-title');
        wrap.hidden = true;
        wrap.innerHTML =
            '<div class="download-qr-modal__backdrop" data-download-modal-dismiss="true" tabindex="-1"></div>' +
            '<div class="download-qr-modal__panel">' +
            '<button type="button" class="download-qr-modal__close" id="download-qr-modal-close" data-download-modal-dismiss="true" data-i18n-aria-label="modal.close" aria-label="Fermer">' +
            '<span aria-hidden="true">&times;</span>' +
            '</button>' +
            '<h2 id="download-qr-modal-title" class="download-qr-modal__title" data-i18n="modal.qr.title">Télécharger l’application</h2>' +
            '<p class="download-qr-modal__lead" data-i18n="modal.qr.lead">Scannez ce code avec l’appareil photo de votre téléphone pour ouvrir la page de téléchargement.</p>' +
            '<div class="download-qr-modal__qr">' +
            '<img id="download-modal-qr-img" src="/images/download-app-qr.png" width="200" height="200" alt="" data-i18n-alt="modal.qr.alt" />' +
            '</div>' +
            '</div>';
        document.body.appendChild(wrap);

        wrap.addEventListener('click', function (e) {
            var dismiss = e.target && e.target.closest && e.target.closest('[data-download-modal-dismiss="true"]');
            if (dismiss) closeModal();
        });
    }

    function syncModalI18n() {
        if (window.goDriveI18n && typeof window.goDriveI18n.apply === 'function') {
            window.goDriveI18n.apply();
        }
    }

    function openModal() {
        ensureModal();
        var root = document.getElementById('download-qr-modal');
        if (!root) return;
        root.hidden = false;
        document.body.classList.add('download-modal-open');
        syncModalI18n();
        var closeBtn = document.getElementById('download-qr-modal-close');
        if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
        var root = document.getElementById('download-qr-modal');
        if (!root) return;
        root.hidden = true;
        document.body.classList.remove('download-modal-open');
    }

    function onKeydown(e) {
        if (e.key !== 'Escape') return;
        var root = document.getElementById('download-qr-modal');
        if (!root || root.hidden) return;
        closeModal();
    }

    document.addEventListener('DOMContentLoaded', function () {
        ensureModal();
        var btn = document.getElementById('header-download-btn');
        if (btn) {
            btn.addEventListener('click', function () {
                openModal();
            });
        }
        document.addEventListener('keydown', onKeydown);
        window.addEventListener('godrive:lang', function () {
            var root = document.getElementById('download-qr-modal');
            if (root && !root.hidden) syncModalI18n();
        });
    });
})();
