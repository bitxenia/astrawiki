import { createHelia } from "helia";
import { createOrbitDB } from "@orbitdb/core";
import { CreateLibp2pOptions } from "./libp2pOptions.js";
import { CreateLibp2pOptionsBrowser } from "./libp2pOptionsBrowser.js";
import { createLibp2p } from "libp2p";
import { loadOrCreateSelfKey } from "@libp2p/config";
import { type OrbitDB } from "@orbitdb/core";
import type { Blockstore } from "interface-blockstore";
import type { Datastore } from "interface-datastore";

export const startOrbitDb = async (
  datastore: Datastore,
  blockstore: Blockstore,
  publicIP: string
) => {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser) {
    console.log("Browser enviroment detected");
  } else {
    console.log("Node enviroment detected");
  }
  const privateKey = await loadOrCreateSelfKey(datastore);

  let libp2pOptions: Object;
  if (isBrowser) {
    libp2pOptions = CreateLibp2pOptionsBrowser();
  } else {
    libp2pOptions = CreateLibp2pOptions(publicIP);
  }

  const libp2p = await createLibp2p({
    datastore,
    privateKey,
    ...libp2pOptions,
  });

  libp2p.addEventListener("certificate:provision", () => {
    console.info("A TLS certificate was provisioned");
  });

  const helia = await createHelia({
    datastore,
    blockstore,
    libp2p,
  });
  console.log(`Node started with id: ${helia.libp2p.peerId.toString()}`);

  const orbitdb = await createOrbitDB({ ipfs: helia });

  console.log("Peer multiaddrs:");
  let multiaddrs = orbitdb.ipfs.libp2p.getMultiaddrs();
  for (const ma of multiaddrs) {
    console.log(`${ma}`);
  }

  // Log the peer's multiaddrs whenever they change
  let oldAddrs = [];
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

  return orbitdb;
};

/**
 * Stops the OrbitDB peer and associated services.
 * @function stopOrbitDB
 * @param {OrbitDB} orbitdb The OrbitDB instance to stop.
 */
export const stopOrbitDB = async (orbitdb: OrbitDB) => {
  await orbitdb.stop();
  await orbitdb.ipfs.stop();
  await orbitdb.ipfs.blockstore.unwrap().unwrap().child.db.close();
};
