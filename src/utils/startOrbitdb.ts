import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { LevelBlockstore } from "blockstore-level";
import { LevelDatastore } from "datastore-level";
import { createHelia } from "helia";
import { createOrbitDB } from "@orbitdb/core";
import { CreateLibp2pOptions } from "./libp2pOptions.js";
import { CreateLibp2pOptionsBrowser } from "./libp2pOptionsBrowser.js";
import { createLibp2p } from "libp2p";
import { loadOrCreateSelfKey } from "@libp2p/config";
import { type OrbitDB } from "@orbitdb/core";

export const startOrbitDb = async (publicIP: string) => {
  const isBrowser = () => typeof window !== "undefined";
  if (isBrowser()) {
    console.log("Browser enviroment detected");
  } else {
    console.log("Node enviroment detected");
  }

  let blockstore: any;
  let datastore: any;
  if (isBrowser()) {
    blockstore = new LevelBlockstore(`data/ipfs/blocks`);
    datastore = new LevelDatastore(`data/ipfs/datastore`);
  } else {
    blockstore = new FsBlockstore("./data/ipfs/block-store");
    datastore = new FsDatastore("./data/ipfs/data-store");
  }
  await datastore.open();

  const privateKey = await loadOrCreateSelfKey(datastore);

  let libp2pOptions: Object;
  if (isBrowser()) {
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
