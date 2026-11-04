import rateLimit from "express-rate-limit";

export const generationRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many generation requests. Please try again later." });
  },
});
