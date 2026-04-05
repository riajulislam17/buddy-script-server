export default () => ({
  port: Number(process.env.PORT),
  frontendUrl: process.env.FRONTEND_URL,
  nodeEnv: process.env.NODE_ENV,
});
