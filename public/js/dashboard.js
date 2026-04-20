(function () {
    function t(k) {
        return window.goDriveI18n ? window.goDriveI18n.t(k) : k;
    }

    var auth = typeof checkAuth === 'function' ? checkAuth() : { token: null, user: null };
    var token = auth.token;
    var user = auth.user;

    if (!token || !user) {
        window.location.replace('/download-app.html');
        return;
    }

    function setSubtitle() {
        var sub = document.getElementById('dashboard-sub');
        if (!sub) return;
        sub.textContent = t(user.role === 'client' ? 'dashboard.sub.client' : 'dashboard.sub.driver');
    }

    setSubtitle();

    if (user.role === 'client') {
        var clientControls = document.getElementById('clientControls');
        if (clientControls) clientControls.style.display = 'block';
    }

    window.addEventListener('godrive:lang', function () {
        setSubtitle();
        loadOrders();
    });

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /** Pour attribut src (ex. data URL QR) — échappe guillemets sans casser le base64. */
    function escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    function transportLabel(type) {
        var raw = String(type || '');
        var norm = raw.replace(/_/g, '-');
        var map = {
            local: 'dashboard.transport.local',
            'inter-city': 'dashboard.transport.intercity',
            international: 'dashboard.transport.international',
        };
        var key = map[raw] || map[norm];
        return key ? t(key) : escapeHtml(raw);
    }

    function statusLabel(s) {
        var map = {
            accepted: 'dashboard.status.accepted',
            in_transit: 'dashboard.status.in_transit',
            delivered: 'dashboard.status.delivered',
            pending: 'dashboard.status.pending',
        };
        if (map[s]) return t(map[s]);
        return escapeHtml(String(s || '—'));
    }

    async function loadOrders() {
        var list = document.getElementById('ordersList');
        if (!list) return;
        list.innerHTML = '';

        var data;
        try {
            var res = await fetch('/api/orders', {
                headers: { Authorization: 'Bearer ' + token },
            });

            if (res.status === 401) {
                try {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                } catch (e) {
                    /* ignore */
                }
                window.location.replace('/download-app.html');
                return;
            }

            data = await res.json().catch(function () {
                return {};
            });

            if (!res.ok || data.success === false) {
                list.innerHTML =
                    '<p class="dashboard-msg dashboard-msg--error" role="alert">' +
                    escapeHtml(data.error || t('dashboard.load_error')) +
                    '</p>';
                return;
            }

            if (!Array.isArray(data.data)) {
                list.innerHTML =
                    '<p class="dashboard-msg dashboard-msg--error" role="alert">' + escapeHtml(t('dashboard.load_error')) + '</p>';
                return;
            }
        } catch (e) {
            list.innerHTML =
                '<p class="dashboard-msg dashboard-msg--error" role="alert">' + escapeHtml(t('dashboard.network_error')) + '</p>';
            return;
        }

        var orderPrefix = t('dashboard.order.prefix');
        var fromL = t('dashboard.order.from');
        var toL = t('dashboard.order.to');
        var typeL = t('dashboard.order.type');
        var statusL = t('dashboard.order.status');
        var qrAlt = t('dashboard.order.qr_alt');
        var labelUpdate = t('dashboard.label.update_status');
        var optChoose = t('dashboard.status.choose');
        var optAcc = t('dashboard.status.accepted');
        var optTransit = t('dashboard.status.in_transit');
        var optDel = t('dashboard.status.delivered');

        data.data.forEach(function (order) {
            var actions = '';
            if (user.role === 'driver' && order.status !== 'delivered') {
                actions =
                    '<div class="form-group" style="margin-top: 0.75rem; margin-bottom: 0;">' +
                    '<label for="status-' +
                    order.id +
                    '">' +
                    escapeHtml(labelUpdate) +
                    '</label>' +
                    '<select id="status-' +
                    order.id +
                    '" class="order-status-select" data-order-id="' +
                    order.id +
                    '">' +
                    '<option value="">' +
                    escapeHtml(optChoose) +
                    '</option>' +
                    '<option value="accepted">' +
                    escapeHtml(optAcc) +
                    '</option>' +
                    '<option value="in_transit">' +
                    escapeHtml(optTransit) +
                    '</option>' +
                    '<option value="delivered">' +
                    escapeHtml(optDel) +
                    '</option>' +
                    '</select></div>';
            }

            list.innerHTML +=
                '<div class="order-card">' +
                '<h3>' +
                escapeHtml(orderPrefix) +
                order.id +
                '</h3>' +
                '<p><strong>' +
                escapeHtml(fromL) +
                '</strong> ' +
                escapeHtml(String(order.pickup_location)) +
                '</p>' +
                '<p><strong>' +
                escapeHtml(toL) +
                '</strong> ' +
                escapeHtml(String(order.dropoff_location)) +
                '</p>' +
                '<p><strong>' +
                escapeHtml(typeL) +
                '</strong> ' +
                transportLabel(order.transport_type) +
                '</p>' +
                '<p><strong>' +
                escapeHtml(statusL) +
                '</strong> <span class="badge ' +
                escapeHtml(String(order.status)) +
                '">' +
                statusLabel(order.status) +
                '</span></p>' +
                (order.qr_code && user.role === 'client'
                    ? '<p style="margin-top:0.75rem;"><img src="' +
                      escapeAttr(String(order.qr_code)) +
                      '" alt="' +
                      escapeAttr(qrAlt) +
                      '" width="120" height="120" style="border-radius:8px;border:1px solid var(--line);"></p>'
                    : '') +
                actions +
                '</div>';
        });
    }

    document.getElementById('orderForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        var pickup = document.getElementById('pickup').value;
        var dropoff = document.getElementById('dropoff').value;
        var type = document.getElementById('type').value;

        var res = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token,
            },
            body: JSON.stringify({
                pickup_location: pickup,
                dropoff_location: dropoff,
                transport_type: type,
            }),
        });

        if (res.ok) {
            alert(t('dashboard.alert.created'));
            loadOrders();
        } else {
            var err = await res.json().catch(function () {
                return {};
            });
            alert(err.error || t('dashboard.alert.create_error'));
        }
    });

    async function updateStatus(id, status) {
        if (!status) return;
        var location = prompt(t('dashboard.prompt.location')) || t('dashboard.prompt.location_default');
        try {
            var res = await fetch('/api/orders/' + id + '/status', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token,
                },
                body: JSON.stringify({ status: status, location: location }),
            });
            if (res.status === 401) {
                try {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                } catch (e) {
                    /* ignore */
                }
                window.location.replace('/download-app.html');
                return;
            }
            var errBody = await res.json().catch(function () {
                return {};
            });
            if (!res.ok) {
                alert(errBody.error || t('dashboard.status_error'));
                return;
            }
        } catch (e) {
            alert(t('dashboard.network_error'));
            return;
        }
        loadOrders();
    }

    document.getElementById('ordersList')?.addEventListener('change', function (e) {
        var el = e.target;
        if (!el || !el.classList || !el.classList.contains('order-status-select')) return;
        var id = el.getAttribute('data-order-id');
        if (!id) return;
        updateStatus(Number(id), el.value);
    });

    loadOrders();
})();
