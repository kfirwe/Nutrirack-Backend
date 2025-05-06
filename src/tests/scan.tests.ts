import request from "supertest";
import app from "../index";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";

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

describe("Scan Routes", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const user = {
      name: "Test User",
      email: "testuser@example.com",
      password: "password123",
      goals: {
        calories: 1,
        protein: 2,
        carbs: 3,
        fat: 4,
      },
    };

    const responseRegister = await request(app)
      .post("/auth/register")
      .send(user);
    expect(responseRegister.status).toBe(201);
    userId = responseRegister.body.user._id;

    const responseLogin = await request(app).post("/auth/login").send(user);
    token = responseLogin.body.accessToken;
  });

  const downloadImage = async (url: string, filepath: string) => {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  };

  test("POST /scan/food - Scan food image", async () => {
    const imagePath = path.join(__dirname, "../../images/chips.jpg");
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at ${imagePath}`);
    }
    const response = await request(app)
      .post("/scan/food")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", imagePath);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("nutrition");
    expect(response.body.nutrition).toHaveProperty("calories");
    expect(response.body.nutrition).toHaveProperty("protein");
    expect(response.body.nutrition).toHaveProperty("carbs");
    expect(response.body.nutrition).toHaveProperty("fat");
  });

  test("POST /scan/barcode - Scan barcode", async () => {
    const barcode = "123456789012";

    const response = await request(app)
      .post("/scan/barcode")
      .set("Authorization", `Bearer ${token}`)
      .send({ barcode });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("nutrition");
    expect(response.body.nutrition).toHaveProperty("cals");
    expect(response.body.nutrition).toHaveProperty("protein");
    expect(response.body.nutrition).toHaveProperty("carbs");
    expect(response.body.nutrition).toHaveProperty("fat");
  });

  test("POST /scan/menu - Scan menu image", async () => {
    const imagePath = path.join(__dirname, "../../images/menu.jpg");
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at ${imagePath}`);
    }
    const response = await request(app)
      .post("/scan/menu")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", imagePath);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("menuText");
    expect(response.body).toHaveProperty("recommendedDish");
    expect(response.body).toHaveProperty("userNutritionalNeeds");
  }, 15000);

  test("GET /scan/recent-foods/:userId - Get recent foods", async () => {
    const response = await request(app)
      .get(`/scan/recent-foods/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
  });

  test("POST /scan/add-to-history - Add food to history", async () => {
    const foodData = {
      userId,
      foodName: "Apple",
      details: {
        cals: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
      },
    };

    const response = await request(app)
      .post("/scan/add-to-history")
      .set("Authorization", `Bearer ${token}`)
      .send(foodData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Food added!");
  });

  test("POST /scan/add-custom-food - Add custom food", async () => {
    const customFood = {
      name: "Custom Salad",
      nutritionDetails: {
        cals: 150,
        protein: 5,
        carbs: 20,
        fat: 7,
      },
    };

    const response = await request(app)
      .post("/scan/add-custom-food")
      .set("Authorization", `Bearer ${token}`)
      .send(customFood);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Custom food added!");
  });

  test("GET /scan/check-goals/:userId - Check user goals", async () => {
    const response = await request(app)
      .get(`/scan/check-goals/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  test("GET /scan/search-foods/:query - Search foods", async () => {
    const query = "apple";

    const response = await request(app)
      .get(`/scan/search-foods/${query}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
  });

  test("POST /scan/estimate-nutrition - Estimate nutrition", async () => {
    const foodData = {
      foodName: "Banana",
    };

    const response = await request(app)
      .post("/scan/estimate-nutrition")
      .set("Authorization", `Bearer ${token}`)
      .send(foodData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message");
  });
});
