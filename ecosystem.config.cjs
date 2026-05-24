const path = require("path");

const root = __dirname;
const serverPort = process.env.SCAVENGER_SERVER_PORT || "3000";
const webPort = process.env.SCAVENGER_WEB_PORT || "3001";

module.exports = {
  apps: [
    {
      name: "scavenger-server",
      cwd: path.join(root, "apps/server"),
      script: "bun",
      args: "run start",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: serverPort,
      },
    },
    {
      name: "scavenger-web",
      cwd: path.join(root, "apps/web"),
      script: "bun",
      args: "run start",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: webPort,
      },
    },
  ],
};
