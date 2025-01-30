import { startOrbitDb } from "./utils/start_orbitdb.ts";
import { ArticleRepository } from "./articleRepository.ts";

const main = async () => {
  const orbitdb = await startOrbitDb();

  const articledb = new ArticleRepository(orbitdb);
  await articledb.init();

  // Updated self multiaddrs?
  console.log("Advertising with addresses:");
  let multiaddrs = orbitdb.ipfs.libp2p.getMultiaddrs();
  for (const ma of multiaddrs) {
    console.log(`${ma}`);
  }
  // Wait for connection and relay to be bind for the example purpose
  orbitdb.ipfs.libp2p.addEventListener("self:peer:update", (evt) => {
    // Updated self multiaddrs?
    console.log("Advertising with addresses:");
    let multiaddrs = orbitdb.ipfs.libp2p.getMultiaddrs();
    for (const ma of multiaddrs) {
      console.log(`${ma}`);
    }
  });
};

main();
