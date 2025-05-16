import { Astrawiki, createAstrawiki } from "../src/index";
import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { publicIpv4 } from "public-ip";
import { generateLoremIpsum, saveMetrics } from "./utils/utils";

const FIVE_MINUTES_TIMEOUT = 1000 * 60 * 5;

describe("Get article metrics", () => {
  let collaborator: Astrawiki;
  let user: Astrawiki;

  beforeAll(async () => {
    const publicIp = await publicIpv4();
    collaborator = await createAstrawiki({
      wikiName: "astrawiki-test",
      isCollaborator: true,
      blockstore: new FsBlockstore("./data/collaborator/blockstore"),
      datastore: new FsDatastore("./data/collaborator/datastore"),
      publicIp,
      dataDir: "./data/collaborator/",
    });
    user = await createAstrawiki({
      wikiName: "astrawiki-test",
      isCollaborator: false,
      blockstore: new FsBlockstore("./data/user/blockstore"),
      datastore: new FsDatastore("./data/user/datastore"),
      publicIp,
      tcpPort: 41001,
      webRTCDirectPort: 41001,
      dataDir: "./data/user",
    });
  }, FIVE_MINUTES_TIMEOUT);

  test(
    "Create and then get 5000 byte article from same user",
    async () => {
      const name = "Test Article";
      const content = generateLoremIpsum(5000);
      await user.newArticle(name, content);
      const durations: number[] = [];
      for (let i = 0; i < 1000; i++) {
        try {
          const start = performance.now();
          const article = await user.getArticle(name);
          const end = performance.now();
          const duration = end - start;
          durations.push(duration);
          expect(article.name).toBe(name);
          expect(article.content).toBe(content);
        } catch (error) {
          console.error(`Error in sample ${i + 1}: `, error);
        }
      }
      saveMetrics(durations, "getArticleSameUser5000");
      expect(durations.length).toEqual(1000);
    },
    FIVE_MINUTES_TIMEOUT,
  );
});
