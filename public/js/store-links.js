/** Remplit les liens App Store / Google Play depuis js/config.js (boutons principaux + pied de page). */
(function () {
    function apply() {
        var ios = window.GODRIVE_IOS_URL || 'https://apps.apple.com/app/godrive';
        var android = window.GODRIVE_ANDROID_URL || 'https://play.google.com/store/apps/details?id=com.godrive.app';
        document.querySelectorAll('#btn-ios, .js-store-ios').forEach(function (el) {
            el.href = ios;
        });
        document.querySelectorAll('#btn-android, .js-store-android').forEach(function (el) {
            el.href = android;
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
})();
