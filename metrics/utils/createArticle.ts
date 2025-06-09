import { getContent, Length } from "./content";
import { saveMetrics, sleep } from "./metrics";
import { getNode } from "./node";

const NUMBER_OF_ARTICLES = 1000;

export async function createArticleMetric(length: Length) {
  const collaborator = await getNode("collaborator", 40001, true);
  const collaboratorAddresses = await collaborator.getNodeMultiaddrs();
  const user1 = await getNode("user1", 40002, false, collaboratorAddresses);
  await user1.newArticle("article0", "some content");

  const content = getContent(length);
  const metricsFilename = `getArticle_${length}`;

  const durations: number[] = [];
  {
    let i = 1;
    while (i <= NUMBER_OF_ARTICLES) {
      const name = `article${i}`;
      try {
        const start = performance.now();
        await user1.newArticle(name, content);
        const end = performance.now();
        const duration = end - start;
        durations.push(duration);
        console.log(`✅Article ${i} created`);
        i++;
      } catch (error) {
        console.error(error);
        await sleep(10000);
      }
    }
  }
  saveMetrics(durations, metricsFilename);
}
