import { ArticleInfo } from "../../src";
import { Length } from "./content";
import { saveMetrics, sleep } from "./metrics";
import { getNode } from "./node";

const NUMBER_OF_ARTICLES = 1000;

export async function getArticleMetric(length: Length) {
  const multiaddress = [
    // "/ip4/127.0.0.1/tcp/40001/p2p/12D3KooWKguyzckg78DJrkixYTqDpC3nGrff3rKsLxZuds1JwTG6",
    // "/ip4/172.17.0.2/tcp/40001/p2p/12D3KooWKguyzckg78DJrkixYTqDpC3nGrff3rKsLxZuds1JwTG6",
    // "/ip4/127.0.0.1/udp/40001/webrtc-direct/certhash/uEiAXl4zcWQrkEad9s45oj2ifTCGIkqYa27aeb81ELP1rlA/p2p/12D3KooWKguyzckg78DJrkixYTqDpC3nGrff3rKsLxZuds1JwTG6",
    // "/ip4/172.17.0.2/udp/40001/webrtc-direct/certhash/uEiAXl4zcWQrkEad9s45oj2ifTCGIkqYa27aeb81ELP1rlA/p2p/12D3KooWKguyzckg78DJrkixYTqDpC3nGrff3rKsLxZuds1JwTG6",
    // "/ip4/190.245.180.10/tcp/40001/p2p/12D3KooWKguyzckg78DJrkixYTqDpC3nGrff3rKsLxZuds1JwTG6",
    "/ip4/190.245.180.10/udp/40001/webrtc-direct/certhash/uEiAXl4zcWQrkEad9s45oj2ifTCGIkqYa27aeb81ELP1rlA/p2p/12D3KooWKguyzckg78DJrkixYTqDpC3nGrff3rKsLxZuds1JwTG6",
  ];
  const user1 = await getNode("user1", 40002, false);
  await sleep(20000);

  const metricsFilename = `getArticle_${length}`;

  const durations: number[] = [];
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
    console.log(`✅Article ${i} fetched`);
    i++;
  }

  saveMetrics(durations, metricsFilename);
}
