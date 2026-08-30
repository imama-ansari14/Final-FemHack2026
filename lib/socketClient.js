"use client";

import { io } from "socket.io-client";

let socket;

// Returns a single shared socket connection for the whole browser tab.
export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: true,
    });
  }
  return socket;
}
