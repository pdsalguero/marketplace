import http from "http";
import app from "./index";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4002;

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
