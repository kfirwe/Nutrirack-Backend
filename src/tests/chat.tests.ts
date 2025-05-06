import request from "supertest";
import app from "../index";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let server: ReturnType<typeof app.listen>;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || "");
    const PORT = parseInt(process.env.PORT as string, 10) || 3000;
    const HOST = process.env.HOST || "localhost";
    server = app.listen(PORT, HOST, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
});

afterEach(async () => {});

afterAll(async () => {
  const collections = mongoose.connection.db
    ? await mongoose.connection.db.collections()
    : [];
  for (const collection of collections) await collection.deleteMany({});
  server.close();
  await mongoose.connection.close();
});

describe("Chat Routes", () => {
  let token: string;
  let userId: string;
  let chatId: string;

  beforeAll(async () => {
    const user = {
      name: "Test User",
      email: "testuser@example.com",
      password: "password123",
    };

    const responseRegister = await request(app)
      .post("/auth/register")
      .send(user);
    expect(responseRegister.status).toBe(201);
    userId = responseRegister.body.user._id;

    const responseLogin = await request(app).post("/auth/login").send(user);
    token = responseLogin.body.accessToken;
  });

  test("GET /chat - Get recent chats", async () => {
    const response = await request(app)
      .get("/chat")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  test("POST /chat/new - Create a new chat", async () => {
    const response = await request(app)
      .post("/chat/new")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("_id");
    expect(response.body).toHaveProperty("userId", userId);
    expect(response.body.messages).toBeInstanceOf(Array);
    chatId = response.body._id;
  });

  test("POST /chat/send - Send a message in a chat", async () => {
    const message = {
      chatId,
      text: "Hello, NutriTrack!",
    };

    const response = await request(app)
      .post("/chat/send")
      .set("Authorization", `Bearer ${token}`)
      .send(message);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("_id", chatId);
    expect(response.body.messages).toBeInstanceOf(Array);
    expect(response.body.messages[0]).toHaveProperty(
      "text",
      "Hello, NutriTrack!"
    );
    expect(response.body.messages[0]).toHaveProperty("sender", "user");
  });
});
