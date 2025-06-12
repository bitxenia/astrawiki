import { getContentBytes, Length } from "./content";
import { saveMetrics, sleep } from "./metrics";
import { getNode } from "./node";

const NUMBER_OF_ARTICLES_PER_SIZE = 5;
const SIZE_INCREMENT = 1000;
const MAX_SIZE = 50000;

export async function createArticleMetric() {
  const collaborator = await getNode("collaborator", 40001, true);
  const collaboratorAddresses = await collaborator.getNodeMultiaddrs();
  const user1 = await getNode("user1", 40002, false, collaboratorAddresses);
  await user1.newArticle("article0", "some content");

  const metricsFilename = `createArticle_${length}`;

  const durationsPerSize: Map<string, number[]> = new Map();
  {
    let size = 1000;
    while (size <= MAX_SIZE) {
      durationsPerSize.set(size.toString(), []);
      const content = getContentBytes(size);
      let i = 1;
      while (i <= NUMBER_OF_ARTICLES_PER_SIZE) {
        const name = `article${i}_${size}`;
        try {
          const start = performance.now();
          await user1.newArticle(name, content);
          const end = performance.now();
          const duration = end - start;
          durationsPerSize.get(size.toString())!.push(duration);
          console.log(`✅ ${name} created`);
          i++;
        } catch (error) {
          console.error(error);
          await sleep(10000);
        }
      }
      size += SIZE_INCREMENT;
    }
  }
  saveMetrics(Object.fromEntries(durationsPerSize), metricsFilename);
}
