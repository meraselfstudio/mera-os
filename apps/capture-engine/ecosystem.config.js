// PM2 process config — auto-start on Mac Mini boot
// Usage: pm2 start ecosystem.config.js && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'capture-engine',
      script: 'server.js',
      cwd: __dirname,
      watch: false,
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
