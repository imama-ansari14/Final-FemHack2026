require("dotenv").config({ path: ".env.local" });
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { verifyToken, COOKIE_NAME } = require("./lib/auth");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { cors: { origin: "*" } });
  global._io = io;

  io.use((socket, next2) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const match = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_NAME}=`));
      if (match) {
        const token = match.split("=")[1];
        socket.user = verifyToken(token);
      }
    } catch (err) {
      // invalid/missing cookie -> socket.user stays undefined, connection still allowed
    }
    next2();
  });

  io.on("connection", (socket) => {
    if (socket.user?.id) socket.join(`user:${socket.user.id}`);

    socket.on("join-ticket", (ticketId) => socket.join(`ticket:${ticketId}`));
    socket.on("leave-ticket", (ticketId) => socket.leave(`ticket:${ticketId}`));
    socket.on("join-agents", () => socket.join("agents"));
    socket.on("leave-agents", () => socket.leave("agents"));
    socket.on("typing", ({ ticketId, name }) => socket.to(`ticket:${ticketId}`).emit("typing", { name }));
  });

  httpServer.listen(port, () => console.log(`> Ready on http://localhost:${port}`));
});