import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { createHelia } from "helia";
import { createOrbitDB } from "@orbitdb/core";
import { CreateLibp2pOptions } from "./libp2p.ts";
import { createLibp2p } from "libp2p";
import { loadOrCreateSelfKey } from "@libp2p/config";
import { Config } from "./config.ts";

export const startOrbitDb = async (config: Config) => {
  const blockstore = new FsBlockstore("./data/ipfs/block-store");
  const datastore = new FsDatastore("./data/ipfs/data-store");
  await datastore.open();

  const privateKey = await loadOrCreateSelfKey(datastore);

  const libp2p = await createLibp2p({
    datastore,
    privateKey,
    ...CreateLibp2pOptions(config),
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
