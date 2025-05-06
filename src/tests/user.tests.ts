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

describe("User Routes", () => {
  let token: string;
  let userId: string;

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

    const response = await request(app).post("/auth/login").send(user);
    token = response.body.accessToken;
  });

  test("GET /user - Get user profile", async () => {
    const response = await request(app)
      .get("/user")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.userData).toHaveProperty(
      "email",
      "testuser@example.com"
    );
  });

  test("POST /user/profile-setup - Update user profile", async () => {
    const profileData = {
      height: 180,
      weight: 75,
      goalWeight: 70,
      age: 30,
      gender: "male",
      activityLevel: 2,
    };

    const response = await request(app)
      .post("/user/profile-setup")
      .set("Authorization", `Bearer ${token}`)
      .send(profileData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Profile updated successfully"
    );
    expect(response.body.goals).toHaveProperty("calories");
    expect(response.body.goals).toHaveProperty("protein");
    expect(response.body.goals).toHaveProperty("carbs");
    expect(response.body.goals).toHaveProperty("fat");
  });

  test("GET /user/macros/today - Get macros for today", async () => {
    const response = await request(app)
      .get("/user/macros/today")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.totalMacros).toHaveProperty("calories");
    expect(response.body.totalMacros).toHaveProperty("protein");
    expect(response.body.totalMacros).toHaveProperty("carbs");
    expect(response.body.totalMacros).toHaveProperty("fat");
  });

  test("GET /user/macros/goals - Get user macro goals", async () => {
    const response = await request(app)
      .get("/user/macros/goals")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.goals).toHaveProperty("calories");
    expect(response.body.goals).toHaveProperty("protein");
    expect(response.body.goals).toHaveProperty("carbs");
    expect(response.body.goals).toHaveProperty("fat");
  });

  test("PUT /user/macros/goals - Update user macro goals", async () => {
    const updatedGoals = {
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 70,
    };

    const response = await request(app)
      .put("/user/macros/goals")
      .set("Authorization", `Bearer ${token}`)
      .send(updatedGoals);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Goals updated successfully"
    );
    expect(response.body.goals).toMatchObject(updatedGoals);
  });

  test("GET /user/goal-completion/:userId - Get goal completion data", async () => {
    const startDate = "1 week";
    const endDate = undefined;
    const response = await request(app)
      .get(`/user/goal-completion/${userId}`)
      .query({ startDate, endDate })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  test("GET /user/nutrient-goal-achievement/:userId - Get nutrient goal achievement", async () => {
    const period = "1 week";
    const nutrient = "protein";
    const response = await request(app)
      .get(`/user/nutrient-goal-achievement/${userId}`)
      .query({ period, nutrient })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  test("GET /user/meal-times/:userId - Get meal times data", async () => {
    const userId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/user/meal-times/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });
});
