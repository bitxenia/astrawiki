import { IPFSAccessController } from "@orbitdb/core";
import { CID } from "multiformats/cid";

// TODO: Add a way to opt to use a different database name. JP
const ARTICLE_DB_NAME = "bitxenia-wiki";

export class ArticleDB {
  constructor(orbitdb) {
    this.orbitdb = orbitdb;
    this.articledb = null;
  }

  async start() {
    // TODO: See if we need to search if the database exists first. JP
    this.articledb = await this.orbitdb.open(ARTICLE_DB_NAME, {
      AccessController: IPFSAccessController({ write: ["*"] }),
    });
    console.log(`Database address: ${this.articledb.address}`);

    // TODO: Search and connect to other providers before providing? JP

    // TODO: Maybe we do not need to wait for the db to be provided. JP
    // this.start_provide_db_service();

    await this.set_up_db_events();
  }

  async start_provide_db_service() {
    // TODO: See if we need to reprovide or if it is done automatically with helia/libp2p. JP
    // TODO: See if we need to also provide the file, we could be getting "banned" from the network. JP
    const parts = this.articledb.address.split("/");
    const cid = parts[2];
    const cidObj = CID.parse(cid);

    // TODO: Find a better way to provide & reprovide the database. JP
    while (true) {
      try {
        console.log("Providing database address:", cid);
        const startTime = performance.now();
        await this.orbitdb.ipfs.routing.provide(cidObj);
        const endTime = performance.now();

        console.log(
          `Database address ${cid} provided, took ${(endTime - startTime) / 1000
          } seconds`
        );
      } catch (error) {
        console.error("Error providing database:", error);
      }
    }
  }

  async set_up_db_events() {
    // TODO: We would want to use voyager for replicating the individual articles db.
    //       This is a temporary solution. JP
    this.articledb.events.on("join", async (peerId, heads) => {
      console.log(`${peerId} joined`)
    })
    this.articledb.events.on("leave", async (peerId) => {
      console.log(`${peerId} left`)
    })
    this.articledb.events.on("update", async (entry) => {
      let [articleName, articleAddress] = entry.payload.value.split("::");

      console.log(
        `New article received: name: ${articleName}, addr: ${articleAddress}`,
        entry.payload.value
      );

      // Replicate the article

      const db = await this.orbitdb.open(articleAddress);
      db.events.on("update", async (peerId, heads) => {
        console.log("Article updated by ", peerId);
      })
      db.events.on("close", () => {
        console.log("Database closed")
      })
      console.log(`Article replicated: ${db.address}`);
      console.log(`Article content: ${await db.all()}`)
    });
  }
}
