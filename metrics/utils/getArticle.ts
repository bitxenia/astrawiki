import { ArticleInfo } from "../../src";
import { getContent, Length } from "./content";
import { saveMetrics, sleep } from "./metrics";
import { getNode, waitForArticleListToBeSynced } from "./node";

const NUMBER_OF_ARTICLES = 50;

export async function getArticleMetric(length: Length) {
  const collaborator = await getNode("collaborator", 40001, true);
  const collaboratorAddresses = await collaborator.getNodeMultiaddrs();
  //NOTE: try one multiaddr at a time
  const user1 = await getNode("user1", 40002, false, [
    collaboratorAddresses[0],
  ]);

  const content = getContent(length);
  const metricsFilename = `getArticle_${length}`;

  const durations: number[] = [];
  {
    let i = 1;
    while (i <= NUMBER_OF_ARTICLES) {
      const name = `article${i}`;
      try {
        await collaborator.newArticle(name, content);
        console.log(`👌Article ${i} created`);
        i++;
        await sleep(100);
      } catch (error) {
        console.error(error);
        await sleep(10000);
      }
    }
  }

  await sleep(10000);
  console.log("🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱🔱");
  await user1.newArticle("article0", "some content");
  await sleep(10000);
  //NOTE: Useless?
  await waitForArticleListToBeSynced(user1, NUMBER_OF_ARTICLES + 1);

  {
    let i = 1;
    while (i <= NUMBER_OF_ARTICLES) {
      let article: ArticleInfo;
      const name = `article${i}`;
      try {
        const start = performance.now();
        article = await user1.getArticle(name);
        const end = performance.now();
        const duration = end - start;
        durations.push(duration);
      } catch (error) {
        console.error(error);
        await sleep(10000);
        continue;
      }
      expect(article.name).toBe(name);
      expect(article.content).toBe(content);
      console.log(`✅Article ${i} fetched`);
      i++;
    }
  }

  saveMetrics(durations, metricsFilename);
}
