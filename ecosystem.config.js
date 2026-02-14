module.exports = {
  apps: [
    {
      name: 'aimin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/data/www/aimin',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
