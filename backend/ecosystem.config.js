export default {
  apps: [
    {
      name: "web3-ecommerce-app",
      script: "dist/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "customdev",
      },
    },
  ],
};
