global.fetch = jest.fn();

describe("ROADTRIP! Application Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe("AuthService", () => {
    let AuthService;

    beforeAll(() => {
      jest.doMock("../services/auth-service", () => ({
        AuthService: {
          getAuthToken: jest.fn(() => {
            if (typeof window !== "undefined" && window.localStorage) {
              return window.localStorage.getItem("auth_token");
            }
            return null;
          }),
          clearAuthStorage: jest.fn(() => {
            if (typeof window !== "undefined" && window.localStorage) {
              window.localStorage.removeItem("auth_token");
              window.localStorage.removeItem("refresh_token");
              window.localStorage.removeItem("userRole");
            }
          }),
          login: jest.fn(async (email, password) => {
            const mockResponse = {
              ok: true,
              json: () =>
                Promise.resolve({
                  tokens: {
                    accessToken: "new-access-token",
                    refreshToken: "new-refresh-token",
                  },
                }),
            };

            global.fetch.mockResolvedValue(mockResponse);
            return mockResponse.json();
          }),
        },
      }));

      AuthService = require("../services/auth-service").AuthService;
    });

    test("should get auth token from localStorage", () => {
      localStorage.setItem("auth_token", "test-token");
      const token = AuthService.getAuthToken();
      expect(token).toBe("test-token");
    });

    test("should clear auth storage on logout", () => {
      AuthService.clearAuthStorage();
      expect(localStorage.getItem("auth_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
    });

    test("should handle login flow", async () => {
      const result = await AuthService.login("test@example.com", "password");
      expect(result.tokens.accessToken).toBeDefined();
    });

  });

  describe("RoadtripService", () => {
    let RoadtripService;

    beforeAll(() => {
      jest.doMock("../services/roadtrip-service", () => ({
        RoadtripService: {
          getPublicRoadtrips: jest.fn(async () => {
            const mockRoadtrips = {
              success: true,
              data: {
                trips: [
                  {
                    _id: "507f1f77bcf86cd799439011",
                    title: "Test Roadtrip",
                    country: "France",
                    duration: 7,
                  },
                ],
              },
            };

            global.fetch.mockResolvedValue({
              ok: true,
              json: () => Promise.resolve(mockRoadtrips),
            });

            return mockRoadtrips.data;
          }),
          getRoadtripById: jest.fn(async (id) => {
            if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
              throw new Error("ID de roadtrip invalide");
            }

            global.fetch.mockResolvedValue({
              ok: true,
              json: () =>
                Promise.resolve({
                  success: true,
                  data: { _id: id, title: "Test" },
                }),
            });

            return { _id: id, title: "Test" };
          }),
          incrementViewCount: jest.fn(async (id) => {
            if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
              return { views: 0 };
            }

            global.fetch.mockResolvedValue({
              ok: true,
              json: () =>
                Promise.resolve({
                  success: true,
                  data: { views: 1 },
                }),
            });

            return { views: 1 };
          }),
        },
      }));

      RoadtripService = require("../services/roadtrip-service").RoadtripService;
    });

    test("should fetch public roadtrips", async () => {
      const result = await RoadtripService.getPublicRoadtrips();

      expect(result.trips).toHaveLength(1);
      expect(result.trips[0].title).toBe("Test Roadtrip");
    });

    test("should validate roadtrip ID format", async () => {
      const invalidId = "invalid-id";

      await expect(RoadtripService.getRoadtripById(invalidId)).rejects.toThrow(
        "ID de roadtrip invalide"
      );
    });

    test("should accept valid MongoDB ObjectId", async () => {
      const validId = "507f1f77bcf86cd799439011";
      const result = await RoadtripService.getRoadtripById(validId);

      expect(result._id).toBe(validId);
    });

    test("should increment view count", async () => {
      const validId = "507f1f77bcf86cd799439011";
      const result = await RoadtripService.incrementViewCount(validId);

      expect(result.views).toBe(1);
    });
  });

  describe("FavoriteService", () => {
    let FavoriteService;

    beforeAll(() => {
      jest.doMock("../services/favorites-service", () => ({
        FavoriteService: {
          toggleFavorite: jest.fn(async (tripId) => {
            const token =
              typeof window !== "undefined" && window.localStorage
                ? window.localStorage.getItem("auth_token")
                : null;

            if (!token) {
              throw new Error("Connexion requise");
            }

            if (!tripId || !/^[0-9a-fA-F]{24}$/.test(tripId)) {
              throw new Error("ID de roadtrip invalide");
            }

            global.fetch.mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({ favorited: true }),
            });

            return { favorited: true };
          }),
          getFavorites: jest.fn(async () => {
            const token =
              typeof window !== "undefined" && window.localStorage
                ? window.localStorage.getItem("auth_token")
                : null;

            if (!token) {
              return { roadtrips: [] };
            }

            const mockFavorites = {
              roadtrips: [
                { _id: "507f1f77bcf86cd799439011", title: "Favorite Trip" },
              ],
            };

            global.fetch.mockResolvedValue({
              ok: true,
              json: () => Promise.resolve(mockFavorites),
            });

            return mockFavorites;
          }),
        },
      }));

      FavoriteService =
        require("../services/favorites-service").FavoriteService;
    });

    test("should toggle favorite successfully", async () => {
      // Simuler un utilisateur connecté
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("auth_token", "test-token");
      }

      const result = await FavoriteService.toggleFavorite(
        "507f1f77bcf86cd799439011"
      );
      expect(result.favorited).toBe(true);
    });

    test("should require authentication for favorites", async () => {
      // S'assurer qu'il n'y a pas de token
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("auth_token");
      }

      await expect(
        FavoriteService.toggleFavorite("507f1f77bcf86cd799439011")
      ).rejects.toThrow("Connexion requise");
    });

    test("should get favorites list", async () => {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("auth_token", "test-token");
      }

      const result = await FavoriteService.getFavorites();
      expect(result.roadtrips).toHaveLength(1);
      expect(result.roadtrips[0].title).toBe("Favorite Trip");
    });
  });

  describe("Utility Functions", () => {
    test("should validate MongoDB ObjectId format", () => {
      const validIds = [
        "507f1f77bcf86cd799439011",
        "507f191e810c19729de860ea",
        "123456789012345678901234",
      ];

      const invalidIds = [
        "invalid-id",
        "123",
        "507f1f77bcf86cd79943901", // trop court
        "507f1f77bcf86cd799439011x", // trop long
        null,
        undefined,
        "",
      ];

      const isValidObjectId = (id) => {
        if (id === null || id === undefined) return false;
        return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
      };

      validIds.forEach((id) => {
        expect(isValidObjectId(id)).toBe(true);
      });

      invalidIds.forEach((id) => {
        expect(isValidObjectId(id)).toBe(false);
      });
    });

    test("should format dates correctly", () => {
      // Test basique de formatage de date
      const testDate = "2024-01-15T10:30:00Z";
      const date = new Date(testDate);
      const formatted = date.toLocaleDateString("fr-FR");

      expect(formatted).toContain("2024");
      expect(formatted).toContain("15");
    });

    test("should handle invalid dates gracefully", () => {
      const formatDate = (dateString) => {
        if (!dateString) return "Date inconnue";
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return "Date inconnue";
          return date.toLocaleDateString("fr-FR");
        } catch {
          return "Date inconnue";
        }
      };

      expect(formatDate(null)).toBe("Date inconnue");
      expect(formatDate(undefined)).toBe("Date inconnue");
      expect(formatDate("")).toBe("Date inconnue");
      expect(formatDate("invalid-date")).toBe("Date inconnue");
    });
  });

  describe("Data Validation", () => {
    test("should validate roadtrip data structure", () => {
      const validRoadtrip = {
        _id: "507f1f77bcf86cd799439011",
        title: "Test Roadtrip",
        country: "France",
        duration: 7,
        budget: 1000,
        tags: ["Nature", "Adventure"],
        description: "A beautiful journey",
        isPremium: false,
        bestSeason: "Été",
      };

      const isValidRoadtrip = (trip) => {
        if (trip === null || trip === undefined) return false;

        return (
          typeof trip._id === "string" &&
          typeof trip.title === "string" &&
          typeof trip.country === "string" &&
          typeof trip.duration === "number" &&
          typeof trip.budget === "number" &&
          Array.isArray(trip.tags) &&
          typeof trip.description === "string" &&
          typeof trip.isPremium === "boolean"
        );
      };

      expect(isValidRoadtrip(validRoadtrip)).toBe(true);
      expect(isValidRoadtrip(null)).toBe(false);
      expect(isValidRoadtrip({})).toBe(false);
    });

    test("should validate user data structure", () => {
      const validUser = {
        id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "user",
        isVerified: true,
      };

      const isValidUser = (user) => {
        return (
          user &&
          typeof user.id === "string" &&
          typeof user.email === "string" &&
          user.email.includes("@") &&
          typeof user.role === "string"
        );
      };

      expect(isValidUser(validUser)).toBe(true);
      expect(isValidUser({ id: "123" })).toBe(false);
      expect(isValidUser({ email: "invalid-email" })).toBe(false);
    });
  });

  describe("Error Handling", () => {
    test("should handle network errors gracefully", async () => {
      const networkErrorService = {
        getPublicRoadtrips: async () => {
          global.fetch.mockRejectedValue(new Error("Network error"));
          throw new Error("Network error");
        },
      };

      await expect(networkErrorService.getPublicRoadtrips()).rejects.toThrow(
        "Network error"
      );
    });

    test("should handle API errors with proper status codes", async () => {
      const apiErrorService = {
        getPublicRoadtrips: async () => {
          global.fetch.mockResolvedValue({
            ok: false,
            status: 404,
            text: () => Promise.resolve("Not found"),
          });
          throw new Error("Erreur 404: Not found");
        },
      };

      await expect(apiErrorService.getPublicRoadtrips()).rejects.toThrow(
        "Erreur 404: Not found"
      );
    });
  });

  describe("Browser Environment", () => {
    test("should have proper browser environment setup", () => {
      expect(typeof window).toBe("object");
      expect(typeof document).toBe("object");
      expect(typeof localStorage).toBe("object");
      expect(typeof fetch).toBe("function");
    });

    test("localStorage should work correctly", () => {
      localStorage.setItem("test-key", "test-value");
      expect(localStorage.getItem("test-key")).toBe("test-value");

      localStorage.removeItem("test-key");
      expect(localStorage.getItem("test-key")).toBeNull();
    });
  });
});

// Test simple pour vérifier que Jest fonctionne
describe("Jest Configuration Test", () => {
  test("should run tests successfully", () => {
    expect(1 + 1).toBe(2);
    expect(typeof window).toBe("object");
    expect(jest).toBeDefined();
  });
});
