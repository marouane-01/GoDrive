/** Customer accounts are stored as role "client" in the database. */
const ROLES = Object.freeze({
    ADMIN: 'admin',
    DRIVER: 'driver',
    CLIENT: 'client',
});

const ALLOWED_ROLES = Object.freeze([ROLES.ADMIN, ROLES.DRIVER, ROLES.CLIENT]);

function isAllowedRole(role) {
    return ALLOWED_ROLES.includes(role);
}

function normalizeRole(role) {
    const value = String(role || '').trim().toLowerCase();
    if (value === 'customer') {
        return ROLES.CLIENT;
    }
    return value;
}

module.exports = {
    ROLES,
    ALLOWED_ROLES,
    isAllowedRole,
    normalizeRole,
};
