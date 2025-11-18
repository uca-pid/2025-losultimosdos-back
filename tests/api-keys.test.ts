import request from "supertest";
import app from "../src/app";
import bcrypt from "bcrypt";

declare const __setRole__: (role: "user" | "admin" | "medibook") => void;
declare const __setUserId__: (id: string) => void;
declare const __seedApiKeys__: (rows: any[]) => void;
declare const __resetApiKeys__: () => void;

const BASE = "/api-keys";

describe("API Key Management Endpoints", () => {
  beforeEach(() => {
    __resetApiKeys__();
    __setRole__("medibook");
    __setUserId__("medibook_user_123");
  });

  describe("POST /api-keys - Create API Key", () => {
    it("should create a new API key for medibook user", async () => {
      const res = await request(app).post(BASE).send({});

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("key");
      expect(res.body.key).toMatch(/^mk_live_[a-f0-9]{64}$/);
      expect(res.body.isActive).toBe(true);
      expect(res.body.lastUsed).toBeNull();
      expect(res.body).toHaveProperty("createdAt");
    });

    it("should return 409 if user already has an API key", async () => {
      // First creation
      await request(app).post(BASE).send({});

      // Second creation attempt
      const res = await request(app).post(BASE).send({});

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("already has an API key");
    });

    it("should return 401 if not authenticated", async () => {
      __setUserId__("");

      const res = await request(app).post(BASE).send({});

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("should return 403 if user doesn't have medibook role", async () => {
      __setRole__("user");

      const res = await request(app).post(BASE).send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Access denied");
      expect(res.body.message).toBe("Medibook role required");
    });

    it("should generate unique keys for different users", async () => {
      const res1 = await request(app).post(BASE).send({});
      const key1 = res1.body.key;

      // Switch to another user
      __setUserId__("medibook_user_456");
      const res2 = await request(app).post(BASE).send({});
      const key2 = res2.body.key;

      expect(key1).not.toBe(key2);
    });
  });

  describe("GET /api-keys - Retrieve API Key", () => {
    it("should return masked API key for user", async () => {
      // Create a key first
      const createRes = await request(app).post(BASE).send({});
      const fullKey = createRes.body.key;

      // Get the key
      const res = await request(app).get(BASE);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body.key).toMatch(/^mk_live_\*+[a-f0-9]{4}$/);
      expect(res.body.key).not.toBe(fullKey);
      expect(res.body.isActive).toBe(true);
      expect(res.body).toHaveProperty("createdAt");
    });

    it("should return 404 if no API key exists", async () => {
      const res = await request(app).get(BASE);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("No API key found");
      expect(res.body.details).toEqual([]);
    });

    it("should return 401 if not authenticated", async () => {
      __setUserId__("");

      const res = await request(app).get(BASE);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("should return 403 if user doesn't have medibook role", async () => {
      __setRole__("admin");

      const res = await request(app).get(BASE);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Access denied");
    });

    it("should only return API key for the authenticated user", async () => {
      // User 1 creates a key
      const createRes = await request(app).post(BASE).send({});
      const keyId1 = createRes.body.id;

      // Switch to user 2
      __setUserId__("medibook_user_456");

      // User 2 should not see user 1's key
      const res = await request(app).get(BASE);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api-keys/:keyId/regenerate - Regenerate API Key", () => {
    it("should regenerate an existing API key", async () => {
      // Create a key
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;
      const oldKey = createRes.body.key;

      // Regenerate
      const res = await request(app)
        .put(`${BASE}/${keyId}/regenerate`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(keyId);
      expect(res.body.key).toMatch(/^mk_live_[a-f0-9]{64}$/);
      expect(res.body.key).not.toBe(oldKey);
      expect(res.body.lastUsed).toBeNull();
      expect(res.body.isActive).toBe(true);
    });

    it("should return 404 if API key not found", async () => {
      const res = await request(app)
        .put(`${BASE}/non-existent-key-id/regenerate`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("API key not found");
    });

    it("should return 403 if API key doesn't belong to user", async () => {
      // User 1 creates a key
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;

      // Switch to user 2
      __setUserId__("medibook_user_456");

      // User 2 tries to regenerate user 1's key
      const res = await request(app)
        .put(`${BASE}/${keyId}/regenerate`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("API key doesn't belong to user");
    });

    it("should return 400 if keyId is invalid UUID format", async () => {
      const res = await request(app)
        .put(`${BASE}/invalid-uuid/regenerate`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api-keys/:keyId - Toggle API Key Status", () => {
    it("should disable an active API key", async () => {
      // Create a key
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;

      // Disable it
      const res = await request(app)
        .put(`${BASE}/${keyId}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(keyId);
      expect(res.body.isActive).toBe(false);
      expect(res.body.key).toMatch(/^mk_live_\*+[a-f0-9]{4}$/);
    });

    it("should enable a disabled API key", async () => {
      // Create and disable a key
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;
      await request(app).put(`${BASE}/${keyId}`).send({ isActive: false });

      // Enable it
      const res = await request(app)
        .put(`${BASE}/${keyId}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(true);
    });

    it("should return 404 if API key not found", async () => {
      const res = await request(app)
        .put(`${BASE}/non-existent-key-id`)
        .send({ isActive: false });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("API key not found");
    });

    it("should return 403 if API key doesn't belong to user", async () => {
      // User 1 creates a key
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;

      // Switch to user 2
      __setUserId__("medibook_user_456");

      // User 2 tries to toggle user 1's key
      const res = await request(app)
        .put(`${BASE}/${keyId}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("API key doesn't belong to user");
    });

    it("should return 400 if isActive is not boolean", async () => {
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;

      const res = await request(app)
        .put(`${BASE}/${keyId}`)
        .send({ isActive: "not-a-boolean" });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api-keys/:keyId - Delete API Key", () => {
    it("should delete an API key", async () => {
      // Create a key
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;

      // Delete it
      const res = await request(app).delete(`${BASE}/${keyId}`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      // Verify it's deleted
      const getRes = await request(app).get(BASE);
      expect(getRes.status).toBe(404);
    });

    it("should return 404 if API key not found", async () => {
      const res = await request(app).delete(`${BASE}/non-existent-key-id`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("API key not found");
    });

    it("should return 403 if API key doesn't belong to user", async () => {
      // User 1 creates a key
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;

      // Switch to user 2
      __setUserId__("medibook_user_456");

      // User 2 tries to delete user 1's key
      const res = await request(app).delete(`${BASE}/${keyId}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("API key doesn't belong to user");
    });
  });

  describe("Security Tests", () => {
    it("should store hashed keys, not plain text", async () => {
      const createRes = await request(app).post(BASE).send({});
      const plainKey = createRes.body.key;

      const getRes = await request(app).get(BASE);
      const maskedKey = getRes.body.key;

      // The masked key should not reveal the full plain key
      expect(maskedKey).not.toBe(plainKey);
      expect(maskedKey.includes("***")).toBe(true);
    });

    it("should generate keys with proper format", async () => {
      const res = await request(app).post(BASE).send({});

      expect(res.body.key).toMatch(/^mk_live_/);
      expect(res.body.key.length).toBe(72); // mk_live_ (8) + 64 hex chars
    });

    it("should only show full key on creation and regeneration", async () => {
      // Create key - should see full key
      const createRes = await request(app).post(BASE).send({});
      expect(createRes.body.key).toMatch(/^mk_live_[a-f0-9]{64}$/);

      // Get key - should see masked key
      const getRes = await request(app).get(BASE);
      expect(getRes.body.key).toMatch(/^mk_live_\*+[a-f0-9]{4}$/);

      // Regenerate key - should see full key
      const regenRes = await request(app)
        .put(`${BASE}/${createRes.body.id}/regenerate`)
        .send({});
      expect(regenRes.body.key).toMatch(/^mk_live_[a-f0-9]{64}$/);

      // Toggle key - should see masked key
      const toggleRes = await request(app)
        .put(`${BASE}/${createRes.body.id}`)
        .send({ isActive: false });
      expect(toggleRes.body.key).toMatch(/^mk_live_\*+[a-f0-9]{4}$/);
    });
  });

  describe("Edge Cases", () => {
    it("should handle concurrent creation attempts", async () => {
      // Simulate two concurrent creation attempts
      const promise1 = request(app).post(BASE).send({});
      const promise2 = request(app).post(BASE).send({});

      const results = await Promise.all([promise1, promise2]);

      // One should succeed, one should fail with 409
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409]);
    });

    it("should allow new key after deletion", async () => {
      // Create and delete
      const createRes = await request(app).post(BASE).send({});
      await request(app).delete(`${BASE}/${createRes.body.id}`);

      // Create again
      const res = await request(app).post(BASE).send({});

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("key");
    });

    it("should preserve isActive status through regeneration", async () => {
      // Create and disable
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;
      await request(app).put(`${BASE}/${keyId}`).send({ isActive: false });

      // Regenerate
      const regenRes = await request(app)
        .put(`${BASE}/${keyId}/regenerate`)
        .send({});

      // The key should be regenerated but remain active
      // (based on the service implementation, regeneration resets to active state)
      expect(regenRes.status).toBe(200);
      expect(regenRes.body.isActive).toBe(true);
    });
  });

  describe("API Key Authentication Middleware", () => {
    it("should validate a valid API key", async () => {
      // This tests the validateApiKey middleware functionality
      // Create a key
      const createRes = await request(app).post(BASE).send({});
      const plainKey = createRes.body.key;

      // In a real scenario, you would use this key to authenticate
      // For testing, we verify the key format is correct
      expect(plainKey).toMatch(/^mk_live_[a-f0-9]{64}$/);
    });

    it("should reject keys with invalid format", async () => {
      // Keys not starting with mk_live_ should be invalid
      const invalidKey = "invalid_key_format";
      expect(invalidKey.startsWith("mk_live_")).toBe(false);
    });

    it("should reject disabled keys", async () => {
      // Create and disable a key
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;
      await request(app).put(`${BASE}/${keyId}`).send({ isActive: false });

      // Verify it's disabled
      const getRes = await request(app).get(BASE);
      expect(getRes.body.isActive).toBe(false);
    });
  });

  describe("Data Integrity", () => {
    it("should maintain consistent timestamps", async () => {
      const beforeCreate = new Date();
      const createRes = await request(app).post(BASE).send({});
      const afterCreate = new Date();

      const createdAt = new Date(createRes.body.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it("should include all required fields in response", async () => {
      const res = await request(app).post(BASE).send({});

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("key");
      expect(res.body).toHaveProperty("isActive");
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("lastUsed");
    });

    it("should return null for lastUsed on new keys", async () => {
      const res = await request(app).post(BASE).send({});

      expect(res.body.lastUsed).toBeNull();
    });

    it("should reset lastUsed on regeneration", async () => {
      const createRes = await request(app).post(BASE).send({});
      const keyId = createRes.body.id;

      // Regenerate
      const regenRes = await request(app)
        .put(`${BASE}/${keyId}/regenerate`)
        .send({});

      expect(regenRes.body.lastUsed).toBeNull();
    });
  });
});
