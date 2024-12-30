import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { createHelia } from "helia";
import { createOrbitDB } from "@orbitdb/core";
import { Libp2pOptions } from "./libp2p.js";

export const startOrbitDb = async () => {
  const blockstore = new FsBlockstore("./data/ipfs/block-store");
  const datastore = new FsDatastore("./data/ipfs/data-store");

  const helia = await createHelia({
    datastore,
    blockstore,
    libp2p: { ...Libp2pOptions },
  });
  console.log(`Node started with id: ${helia.libp2p.peerId.toString()}`);

  const orbitdb = await createOrbitDB({ ipfs: helia });

  return orbitdb;
};
