(function () {
    var lastActiveElement = null;
    var releaseTrap = null;

    function ensureModal() {
        if (document.getElementById('download-qr-modal')) return;
        var wrap = document.createElement('div');
        wrap.id = 'download-qr-modal';
        wrap.className = 'download-qr-modal';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-labelledby', 'download-qr-modal-title');
        wrap.setAttribute('data-a11y-keep-visible', 'true');
        wrap.hidden = true;
        wrap.innerHTML =
            '<div class="download-qr-modal__backdrop" data-download-modal-dismiss="true" tabindex="-1" aria-hidden="true"></div>' +
            '<div class="download-qr-modal__panel">' +
            '<button type="button" class="download-qr-modal__close" id="download-qr-modal-close" data-download-modal-dismiss="true" data-i18n-aria-label="modal.close" aria-label="Fermer">' +
            '<span aria-hidden="true">&times;</span>' +
            '</button>' +
            '<h2 id="download-qr-modal-title" class="download-qr-modal__title" data-i18n="modal.qr.title">Télécharger l’application</h2>' +
            '<p class="download-qr-modal__lead" data-i18n="modal.qr.lead">Scannez ce code avec l’appareil photo de votre téléphone pour ouvrir la page de téléchargement.</p>' +
            '<div class="download-qr-modal__qr">' +
            '<img id="download-modal-qr-img" src="/images/download-app-qr.webp" srcset="/images/download-app-qr-170w.webp 170w, /images/download-app-qr-340w.webp 340w" sizes="200px" width="200" height="200" alt="QR code — page de téléchargement Go Drive" data-i18n-alt="modal.qr.alt" />' +
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

        lastActiveElement = document.activeElement;
        root.hidden = false;
        document.body.classList.add('download-modal-open');

        if (window.goDriveA11y) {
            window.goDriveA11y.setBackgroundInert(root);
            var panel = root.querySelector('.download-qr-modal__panel');
            if (panel && typeof window.goDriveA11y.trapFocus === 'function') {
                releaseTrap = window.goDriveA11y.trapFocus(panel, { onEscape: closeModal });
            }
        }

        syncModalI18n();
        var closeBtn = document.getElementById('download-qr-modal-close');
        if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
        var root = document.getElementById('download-qr-modal');
        if (!root || root.hidden) return;

        root.hidden = true;
        document.body.classList.remove('download-modal-open');

        if (typeof releaseTrap === 'function') {
            releaseTrap();
            releaseTrap = null;
        }
        if (window.goDriveA11y) {
            window.goDriveA11y.clearBackgroundInert();
        }

        if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
            lastActiveElement.focus();
        }
        lastActiveElement = null;
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
