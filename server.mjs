import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000"],
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Store active sessions (in production, use Redis or similar)
  const sessions = new Map();

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join a session
    socket.on("join-session", (sessionId) => {
      socket.join(sessionId);
      console.log(`Socket ${socket.id} joined session: ${sessionId}`);

      // Store session info
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          id: sessionId,
          clients: new Set(),
          createdAt: new Date(),
        });
      }
      sessions.get(sessionId).clients.add(socket.id);

      // Send session info back
      socket.emit("session-joined", {
        sessionId,
        timestamp: new Date().toISOString(),
      });
    });

    // Leave a session
    socket.on("leave-session", (sessionId) => {
      socket.leave(sessionId);
      console.log(`Socket ${socket.id} left session: ${sessionId}`);

      if (sessions.has(sessionId)) {
        sessions.get(sessionId).clients.delete(socket.id);
        if (sessions.get(sessionId).clients.size === 0) {
          // Optional: clean up empty sessions after some time
          // sessions.delete(sessionId);
        }
      }
    });

    // Handle chat messages
    socket.on("chat-message", async (data) => {
      const { sessionId, message } = data;
      console.log(`Message in session ${sessionId}:`, message);

      // Broadcast to all clients in the session
      io.to(sessionId).emit("chat-message", {
        sessionId,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle streaming recipe search
    socket.on("search-recipes", async (data) => {
      const { sessionId, query, messageId } = data;
      console.log(`Recipe search in session ${sessionId}:`, query);

      try {
        // Import Gemini utilities
        const { searchRecipes } = await import("./src/lib/gemini.ts");

        // Start streaming status
        io.to(sessionId).emit("search-status", {
          sessionId,
          messageId,
          status: "searching",
          message: "Searching for recipes...",
        });

        // Search for recipes
        const recipes = await searchRecipes(query);

        // Send results
        io.to(sessionId).emit("search-results", {
          sessionId,
          messageId,
          recipes,
          query,
        });

        // Complete status
        io.to(sessionId).emit("search-status", {
          sessionId,
          messageId,
          status: "complete",
          message: `Found ${recipes.length} recipes`,
        });
      } catch (error) {
        console.error("Error searching recipes:", error);
        io.to(sessionId).emit("search-error", {
          sessionId,
          messageId,
          error: error.message || "Failed to search recipes",
        });
      }
    });

    // Handle streaming intent detection
    socket.on("detect-intent", async (data) => {
      const { sessionId, message, messageId } = data;

      try {
        const { detectRecipeIntent } = await import("./src/lib/gemini.ts");

        io.to(sessionId).emit("intent-status", {
          sessionId,
          messageId,
          status: "analyzing",
        });

        const intent = await detectRecipeIntent(message);

        io.to(sessionId).emit("intent-result", {
          sessionId,
          messageId,
          intent,
        });
      } catch (error) {
        console.error("Error detecting intent:", error);
        io.to(sessionId).emit("intent-error", {
          sessionId,
          messageId,
          error: error.message || "Failed to detect intent",
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);

      // Clean up session references
      sessions.forEach((session, sessionId) => {
        session.clients.delete(socket.id);
      });
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> WebSocket server running on ws://${hostname}:${port}`);
    });
});
