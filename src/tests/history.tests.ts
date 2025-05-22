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

afterAll(async () => {
  const collections = mongoose.connection.db
    ? await mongoose.connection.db.collections()
    : [];
  for (const collection of collections) await collection.deleteMany({});
  server.close();
  await mongoose.connection.close();
});

describe("History Routes", () => {
  let token: string;
  let userId: string;
  let mealId: string;

  beforeAll(async () => {
    const user = {
      name: "Test User",
      email: "testuserhistory@example.com",
      password: "password123",
    };

    const responseRegister = await request(app)
      .post("/auth/register")
      .send(user);
    expect(responseRegister.status).toBe(201);
    userId = responseRegister.body.user._id;

    const responseLogin = await request(app).post("/auth/login").send(user);
    token = responseLogin.body.accessToken;

    const mealRes = await request(app)
      .post("/scan/add-custom-food")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nutritionDetails: { cals: 100, protein: 10, carbs: 20, fat: 5 },
      });
    expect(mealRes.status).toBe(200);

    const mealsByDateRes = await request(app)
      .get(`/history/mealsbydate/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .query({ date: new Date().toISOString() });
    expect(mealsByDateRes.status).toBe(200);
    const meals = mealsByDateRes.body.meals;
    mealId = meals && meals.length > 0 ? meals[0]._id : undefined;
  });

  test("GET /history/mealsbydate/:userId - Get meals by date", async () => {
    const response = await request(app)
      .get(`/history/mealsbydate/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .query({ date: new Date().toISOString() });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("meals");
    expect(Array.isArray(response.body.meals)).toBe(true);
  });

  test("PUT /history/ - Update meal", async () => {
    const response = await request(app)
      .put("/history/")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mealId,
        nutritionDetails: { cals: 150, protein: 15, carbs: 25, fat: 7 },
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Meal updated successfully"
    );
    expect(response.body).toHaveProperty("meal");
    expect(response.body.meal.nutritionDetails.cals).toBe(150);
  });

  test("DELETE /history/:mealId - Delete meal by mealId", async () => {
    const response = await request(app)
      .delete(`/history/${mealId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("meals");
  });
});
