import { rm } from "fs/promises";
import { createArticleMetric } from "./utils/createArticle";

const FIVE_HOUR_TIMEOUT = 1000 * 60 * 60 * 5;

describe("createArticle", () => {
  beforeAll(
    async () => await rm("./data", { recursive: true, force: true }),
    FIVE_HOUR_TIMEOUT,
  );

  test(
    "createArticleShort",
    async () => await createArticleMetric("short"),
    FIVE_HOUR_TIMEOUT,
  );
});
