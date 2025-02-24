import { startOrbitDb } from "./utils/startOrbitdb.ts";
import { ArticleRepository } from "./articleRepository.ts";
import { Config } from "./utils/config.ts";

const main = async () => {
  const config = new Config();

  const orbitdb = await startOrbitDb(config);

  console.log("Peer multiaddrs:");
  let multiaddrs = orbitdb.ipfs.libp2p.getMultiaddrs();
  for (const ma of multiaddrs) {
    console.log(`${ma}`);
  }

  // TODO: Move & handle this in a separate place.
  // Log the peer's multiaddrs whenever they change
  let oldAddrs = new Map();
  orbitdb.ipfs.libp2p.addEventListener("self:peer:update", (evt) => {
    const newAddrs = orbitdb.ipfs.libp2p.getMultiaddrs();
    if (JSON.stringify(oldAddrs) !== JSON.stringify(newAddrs)) {
      console.log("Peer multiaddrs changed:");
      for (const ma of newAddrs) {
        console.log(`${ma}`);
      }
      oldAddrs = newAddrs;
    }
  });

  const articledb = new ArticleRepository(orbitdb, config);
  await articledb.init();
};

main();
