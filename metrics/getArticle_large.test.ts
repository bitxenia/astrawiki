import { rm } from "fs/promises";
import { getArticleMetric } from "./utils/getArticle";

const FIVE_HOUR_TIMEOUT = 1000 * 60 * 60 * 5;

describe("getArticle", () => {
  beforeAll(
    async () => await rm("./data", { recursive: true, force: true }),
    FIVE_HOUR_TIMEOUT,
  );

  test(
    "getArticleShort",
    async () => await getArticleMetric("large"),
    FIVE_HOUR_TIMEOUT,
  );
});
