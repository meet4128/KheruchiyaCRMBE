/**
 * PM2 cluster — multiple Node workers behind nginx load balancer.
 * Usage: pm2 start ecosystem.config.cjs && pm2 save
 *
 * Nginx upstream should list one server entry per instance port, OR use
 * a single port with PM2 cluster (all workers share PORT via SO_REUSEPORT / PM2 routing).
 * Simplest VPS setup: instances: 2, same PORT — PM2 handles distribution on one machine.
 */
module.exports = {
  apps: [
    {
      name: 'kheruchiya-backend',
      script: 'src/server.js',
      cwd: __dirname,
      instances: process.env.PM2_INSTANCES || 2,
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
