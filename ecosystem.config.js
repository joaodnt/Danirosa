module.exports = {
  apps: [
    {
      name: "dani-rosa-dashboard",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/var/www/dani-rosa",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      max_memory_restart: "500M",
      error_file: "/var/log/pm2/dani-rosa-error.log",
      out_file: "/var/log/pm2/dani-rosa-out.log",
      merge_logs: true,
      time: true
    }
  ]
};
