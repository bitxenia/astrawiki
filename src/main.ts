import { startOrbitDb } from "./utils/startOrbitdb.ts";
import { ArticleRepository } from "./articleRepository.ts";

const main = async () => {
  const orbitdb = await startOrbitDb();

  console.log("Peer multiaddrs:");
  let multiaddrs = orbitdb.ipfs.libp2p.getMultiaddrs();
  for (const ma of multiaddrs) {
    console.log(`${ma}`);
  }

  const articledb = new ArticleRepository(orbitdb);
  await articledb.init();
};

main();
