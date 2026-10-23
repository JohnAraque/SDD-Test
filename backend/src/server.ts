import { createApp } from './app';

const port = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`Servidor de reservas de pádel activo en http://localhost:${port}`);
});
