(function () {
    const FOCUSABLE =
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusable(container) {
        return Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => {
            if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
            return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
        });
    }

    function trapFocus(container, options) {
        const opts = options || {};

        function onKeydown(e) {
            if (e.key === 'Escape' && typeof opts.onEscape === 'function') {
                opts.onEscape(e);
                return;
            }
            if (e.key !== 'Tab') return;

            const focusable = getFocusable(container);
            if (!focusable.length) {
                e.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (e.shiftKey) {
                if (active === first || !container.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last || !container.contains(active)) {
                e.preventDefault();
                first.focus();
            }
        }

        container.addEventListener('keydown', onKeydown);
        return function release() {
            container.removeEventListener('keydown', onKeydown);
        };
    }

    let hiddenSiblings = [];

    function setBackgroundInert(keepVisible) {
        const keep = new Set(Array.isArray(keepVisible) ? keepVisible : [keepVisible]);
        hiddenSiblings = [];

        Array.from(document.body.children).forEach((child) => {
            if (!child || keep.has(child)) return;
            if (child.hasAttribute('data-a11y-keep-visible')) return;
            child.setAttribute('aria-hidden', 'true');
            hiddenSiblings.push(child);
        });
    }

    function clearBackgroundInert() {
        hiddenSiblings.forEach((el) => el.removeAttribute('aria-hidden'));
        hiddenSiblings = [];
    }

    window.goDriveA11y = {
        trapFocus,
        setBackgroundInert,
        clearBackgroundInert,
        getFocusable,
    };
})();
