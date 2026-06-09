const DEFAULT_PORT = 3001;

module.exports = {
    apps: [
        {
            name: 'godrive',
            script: 'server.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'development',
                PORT: DEFAULT_PORT,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: DEFAULT_PORT,
                TRUST_PROXY: 'true',
                FORCE_HTTPS: 'true',
            },
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            merge_logs: true,
            time: true,
        },
    ],
};
