// npm run devStart to run the server
import fastify from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
dotenv.config();
import { Server } from "socket.io";
import http from "http";

const app = fastify();

const server = http.createServer(app);

app.register(sensible);

app.register(cors, {
  origin: process.env.CLIENT_URL,
  credentials: true,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// Define a route to fetch data from your database
app.get("/links", async (req, res) => {
  const client = await pool.connect();
  try {
    // Wrap the database query in the commitToDb function
    const result = await commitToDb(client.query("SELECT id, name FROM links"));

    // Check if there was an error
    if (result instanceof Error) {
      res.status(500).send(result.message);
    } else {
      res.send(result.rows);
    }
  } finally {
    client.release(); // Always release the client back to the pool
  }
});

// Route to check if a specific link exists
app.get("/check-link", async (req, res) => {
  const linkName = req.query.link;
  if (!linkName) {
    return res.status(400).send("Link query parameter is required");
  }

  const client = await pool.connect();
  try {
    // Updated query to fetch the id of the link
    const query = "SELECT id FROM links WHERE name = $1 LIMIT 1";
    const result = await commitToDb(client.query(query, [linkName]));
    console.log(result.rows);
    if (result instanceof Error) {
      res.status(500).send(result.message);
    } else {
      // Check if any row is returned
      if (result.rows.length > 0) {
        // Send the id of the link
        res.send({ exists: true, id: result.rows[0].id });
      } else {
        // If no link is found, return exists as false
        res.send({ exists: false });
      }
    }
  } catch (error) {
    app.log.error(error);
    res.status(500).send("Internal server error");
  } finally {
    client.release();
  }
});

app.get("/links/:id", async (request, reply) => {
  const linkId = request.params.id;

  const client = await pool.connect();
  try {
    const query = `
      SELECT
        links.id,
        links.name,
        links.description,
        links.created_at,
        links.creator_user_id,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', comments.id,
              'message', comments.message,
              'parentId', comments.parent_id,
              'createdAt', comments.created_at,
              'user', JSON_BUILD_OBJECT(
                'id', users.id,
                'name', users.name
              )
            ) ORDER BY comments.created_at DESC
          ) FILTER (WHERE comments.id IS NOT NULL),
          '[]'
        ) AS comments
      FROM public.links
      LEFT JOIN public.comments ON links.id = comments.link_id
      LEFT JOIN public.users ON comments.user_id = users.id
      WHERE links.id = $1
      GROUP BY links.id;
    `;

    const result = await client.query(query, [linkId]);

    if (result.rows.length > 0) {
      reply.send(result.rows[0]);
    } else {
      reply.status(404).send("Link not found");
    }
  } catch (error) {
    app.log.error(error);
    reply.status(500).send("Internal server error");
  } finally {
    client.release();
  }
});

async function commitToDb(promise) {
  const [error, data] = await app.to(promise);
  if (error) return app.httpErrors.internalServerError(error.message);
  return data;
}

app.listen({ port: process.env.PORT });

server.listen(3001, () => {
  console.log("SERVER RUNNING");
});
