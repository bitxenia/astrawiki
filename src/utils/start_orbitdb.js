import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { createHelia } from "helia";
import { createOrbitDB, IPFSAccessController } from "@orbitdb/core";
import { CID } from "multiformats/cid";
import { Libp2pOptions } from "./libp2p.js";

// TODO: Add a way to opt to use a different database name. JP
const DB_NAME = "bitxenia-wiki";

export const startOrbitDB = async () => {
  const blockstore = new FsBlockstore("./data/ipfs/block-store");
  const datastore = new FsDatastore("./data/ipfs/data-store");

  const helia = await createHelia({
    datastore,
    blockstore,
    libp2p: { ...Libp2pOptions },
  });
  console.log(`Node started with id: ${helia.libp2p.peerId.toString()}`);

  const orbitdb = await createOrbitDB({ ipfs: helia });

  // TODO: See if we need to search if the database exists first. JP
  const db = await orbitdb.open(DB_NAME, {
    AccessController: IPFSAccessController({ write: ["*"] }),
  });
  console.log(`Database address: ${db.address}`);

  // TODO: Search and connect to other providers before providing? JP

  // TODO: Maybe we do not need to wait for the db to be provided. JP
  await provide_db(helia, db);

  // return orbitdb and the db
  return { orbitdb, helia, db };
};

const provide_db = async (helia, db) => {
  // TODO: See if we need to reprovide or if it is done automatically with helia/libp2p. JP
  // TODO: See if we need to also provide the file, we could be getting "banned" from the network. JP
  const parts = db.address.split("/");
  const cid = parts[2];
  const cidObj = CID.parse(cid);

  console.log("Providing database address:", cid);
  const startTime = performance.now();
  await helia.libp2p.contentRouting.provide(cidObj);
  const endTime = performance.now();

  console.log(
    `Database address ${cid} provided, took ${
      (endTime - startTime) / 1000
    } seconds`
  );
};
