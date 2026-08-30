// Custom server: runs Next.js and attaches Socket.IO to the SAME http server.
// This is what makes real-time updates (new messages, status changes) possible.
require("dotenv").config({ path: ".env.local" });
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // Make io reachable from API routes via global scope.
  // (Next.js API routes run in the same process as this server.)
  global._io = io;

  io.use((socket, next2) => {
    // Optional lightweight auth: client sends its JWT when connecting.
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
      }
    } catch (err) {
      // Invalid token -> connection still allowed but socket.user stays undefined.
    }
    next2();
  });

  io.on("connection", (socket) => {
    // Each ticket gets its own "room". Anyone viewing ticket X joins room "ticket:X"
    // and only receives events for that ticket.
    socket.on("join-ticket", (ticketId) => {
      socket.join(`ticket:${ticketId}`);
    });

    socket.on("leave-ticket", (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
    });

    // Simple typing indicator (bonus feature)
    socket.on("typing", ({ ticketId, name }) => {
      socket.to(`ticket:${ticketId}`).emit("typing", { name });
    });

    // Agents join a shared "agents" room to get live dashboard updates
    socket.on("join-agents", () => {
      socket.join("agents");
    });
  });

  httpServer.listen(port, () => {
    console.log(`> SupportFlow ready on http://localhost:${port}`);
  });
});
