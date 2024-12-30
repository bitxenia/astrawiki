import { IPFSAccessController } from "@orbitdb/core";
import { CID } from "multiformats/cid";

// TODO: Add a way to opt to use a different database name. JP
const ARTICLE_DB_NAME = "bitxenia-wiki";

export const startArticleDb = async (orbitDb) => {
  // TODO: See if we need to search if the database exists first. JP
  const articleDb = await orbitDb.open(ARTICLE_DB_NAME, {
    AccessController: IPFSAccessController({ write: ["*"] }),
  });
  console.log(`Database address: ${articleDb.address}`);

  // TODO: Search and connect to other providers before providing? JP

  // TODO: Maybe we do not need to wait for the db to be provided. JP
  start_provide_db_service(orbitDb, articleDb);

  await set_up_db_events(articleDb);

  // return orbitdb and the db
  return articleDb;
};

const start_provide_db_service = async (orbitDb, articleDb) => {
  // TODO: See if we need to reprovide or if it is done automatically with helia/libp2p. JP
  // TODO: See if we need to also provide the file, we could be getting "banned" from the network. JP
  const parts = articleDb.address.split("/");
  const cid = parts[2];
  const cidObj = CID.parse(cid);

  // TODO: Find a better way to provide & reprovide the database. JP
  while (true) {
    try {
      console.log("Providing database address:", cid);
      const startTime = performance.now();
      await orbitDb.ipfs.routing.provide(cidObj);
      const endTime = performance.now();

      console.log(
        `Database address ${cid} provided, took ${
          (endTime - startTime) / 1000
        } seconds`
      );
    } catch (error) {
      console.error("Error providing database:", error);
    }
  }
};

const set_up_db_events = async (articleDb) => {
  // TODO: We would want to use voyager for replicating the individual articles db.
  //       This is a temporary solution. JP
  articleDb.events.on("update", async (entry) => {
    console.log("New article created received:", entry.payload.value);

    let { articleName, articleAddress } = record.payload.value.split("::");

    console.log(
      `New article received: name: ${articleName}, addr: ${articleAddress}`,
      entry.payload.value
    );

    // Replicate the article
    const db = await orbitdb.open(articleAddress);
    console.log(`Article replicated: ${db.address}`);
  });
};
