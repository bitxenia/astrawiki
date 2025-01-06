import { startOrbitDb } from "./utils/start_orbitdb.js";
import { ArticleDB } from "./articledb.js";

const main = async () => {
  const orbitdb = await startOrbitDb();

  const articledb = new ArticleDB(orbitdb);
  await articledb.start();

  // Wait for connection and relay to be bind for the example purpose
  orbitdb.ipfs.libp2p.addEventListener("self:peer:update", (evt) => {
    // Updated self multiaddrs?
    console.log("Advertising with a relay addresses:");
    let multiaddrs = orbitdb.ipfs.libp2p.getMultiaddrs();
    for (const ma of multiaddrs) {
      if (ma.toString().includes("p2p-circuit")) {
        console.log(`${ma}`);
      }
    }
  });
};

main();
