import { publicIpv4 } from "public-ip";
import { Astrawiki, createAstrawiki } from "../../src";
import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { sleep } from "./metrics";

export async function getNode(
  name: string,
  port: number,
  isCollaborator: boolean,
  peers: string[] = [],
): Promise<Astrawiki> {
  const publicIp = await publicIpv4();
  if (peers.length > 0) {
    return await createAstrawiki({
      wikiName: "astrawiki-test",
      isCollaborator,
      blockstore: new FsBlockstore(`./data/${name}/blockstore`),
      datastore: new FsDatastore(`./data/${name}/datastore`),
      publicIp,
      tcpPort: port,
      webRTCDirectPort: port,
      dataDir: `./data/${name}/`,
      bootstrapProviderPeers: peers,
    });
  } else {
    return await createAstrawiki({
      wikiName: "astrawiki-test",
      isCollaborator,
      blockstore: new FsBlockstore(`./data/${name}/blockstore`),
      datastore: new FsDatastore(`./data/${name}/datastore`),
      publicIp,
      tcpPort: port,
      webRTCDirectPort: port,
      dataDir: `./data/${name}/`,
    });
  }
}

export async function waitForArticleListToBeSynced(
  node: Astrawiki,
  amountExpected: number,
): Promise<void> {
  let articlesSynced: string[] = [];
  while (articlesSynced.length !== amountExpected) {
    const difference = amountExpected - articlesSynced.length;
    console.info(
      `🕑Waiting for articles to sync. Articles missing: ${difference}`,
    );
    articlesSynced = await node.getArticleList();
    await sleep(2000);
  }
  console.log("🙂All articles synced");
}
