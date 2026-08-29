function emitToTicket(ticketId, event, payload) {
  if (global._io) global._io.to(`ticket:${ticketId}`).emit(event, payload);
}

function emitToAgents(event, payload) {
  if (global._io) global._io.to("agents").emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (global._io) global._io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { emitToTicket, emitToAgents, emitToUser };