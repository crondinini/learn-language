import { Hono } from "hono";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";
import { predictNextPeriod, savePrediction } from "../services/prediction.js";

const predictionsRouter = new Hono<{ Variables: { user: AuthUser } }>();
predictionsRouter.use("*", authMiddleware);

predictionsRouter.get("/", async (c) => {
  const { userId } = c.get("user");
  const prediction = await predictNextPeriod(userId);

  if (!prediction) {
    return c.json(
      {
        message:
          "Not enough data to predict. Log at least 3 completed periods.",
        prediction: null,
      },
      200
    );
  }

  await savePrediction(userId, prediction);

  return c.json({ prediction });
});

export default predictionsRouter;
