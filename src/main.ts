import { startOrbitDb } from "./utils/start_orbitdb.js";
import { ArticleDB } from "./articledb.js";

const main = async () => {
  const orbitdb = await startOrbitDb();

  const articledb = new ArticleDB(orbitdb);
  await articledb.start();

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
