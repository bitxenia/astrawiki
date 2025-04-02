import {
  type OrbitDB,
  ComposedStorage,
  IPFSAccessController,
  IPFSBlockStorage,
  LRUStorage,
} from "@orbitdb/core";
import { CID } from "multiformats/cid";

class Database {
  orbitdb: OrbitDB;
  openDb: any;
  dbAddressCID: CID;

  public async createDatabase(dbName: string) {
    // We use the default storage, found in:
    // https://github.com/orbitdb/orbitdb/blob/d290032ebf1692feee1985853b2c54d376bbfc82/src/access-controllers/ipfs.js#L56
    const storage = await ComposedStorage(
      await LRUStorage({ size: 1000 }),
      await IPFSBlockStorage({ ipfs: this.orbitdb.ipfs, pin: true })
    );

    const db = await this.orbitdb.open(dbName, {
      AccessController: IPFSAccessController({
        write: ["*"],
        storage,
      }),
    });

    return db;
  }

  public async syncDb(): Promise<boolean> {
    // We wait for the database to be synced with at least one provider.
    // This is because the database is empty until it is synced.
    let synced = false;
    const onJoin = async (peerId, heads) => {
      synced = true;
    };
    // We use the join event to know when an exchange of heads (sync) happened between peers.
    // https://api.orbitdb.org/module-Sync-Sync.html#event:join
    this.openDb.events.on("join", onJoin);

    // TODO: Maybe there is a race condition here, we should check if the event already fired.
    // Check if the database is already synced by looking at the entries could not work because
    // the database could not be empty locally and not synced with the providers.

    try {
      await this.waitFor(() => synced, true);
    } catch (error) {
      console.error("Timeout waiting for database to sync:", error);
      console.log(
        "Database was not synced with any provider. Asuming it is a new database with no providers."
      );
      return false;
    }
    return true;
  }

  public async waitFor(
    valueA: any,
    toBeValueB: any,
    pollInterval = 100,
    timeout = 60000
  ): Promise<void> {
    // TODO: We use this slight modifided busy wait found in the OrbitDB codebase:
    // https://github.com/orbitdb/orbitdb/blob/main/test/utils/wait-for.js
    // They use it to wait for the database to be synced.
    // We should find a better way to do this, not using a busy wait.

    let elapsedTime = 0;
    return new Promise<void>((resolve) => {
      const interval = setInterval(async () => {
        if (elapsedTime >= timeout) {
          throw new Error("Timeout waiting for condition");
        }
        if ((await valueA()) === (await toBeValueB())) {
          clearInterval(interval);
          resolve();
        }
      }, pollInterval);
      elapsedTime += pollInterval;
    });
  }
}

export class ArticleRepositoryDatabase extends Database {
  public async init(
    orbitdb: OrbitDB,
    wikiName: string,
    isCollaborator: boolean
  ) {
    this.orbitdb = orbitdb;
    this.openDb = await this.createDatabase(wikiName);
    this.dbAddressCID = this.getDBAddressCID();

    // Start connecting to providers.
    // We do not await for this to finish so it can run in the background.
    this.startService(async () => {
      await this.connectToProviders();
    });

    // TODO: Maybe add a flag to know if the database is new and we should not sync.
    const synced = await this.syncDb();

    if (!isCollaborator && !synced) {
      // If we are not a collaborator and no providers were found, we need to raise an error.
      // This is because a non collaborator node cannot create a new wiki.
      throw Error(`No providers found for the database ${this.openDb.address}`);
    }

    if (isCollaborator) {
      // We only provide the database if we are a collaborator.
      this.startService(async () => {
        await this.provideDB();
      });
    }
  }

  private async connectToProviders(): Promise<boolean> {
    let providersFound = false;

    // TODO: Check if we need to add a timeout.
    try {
      let providers =
        await this.orbitdb.ipfs.libp2p.contentRouting.findProviders(
          this.dbAddressCID
        );
      for await (const provider of providers) {
        providersFound = true;
        console.log(`Connecting to provider: ${provider.id}`);
        try {
          await this.orbitdb.ipfs.libp2p.dial(provider.id);
        } catch (error) {
          console.error(
            `Error connecting to provider ${provider.id}: ${error}`
          );
        }
      }
    } catch (error) {
      console.error("Error finding providers:", error);
    }
    return providersFound;
  }

  private async provideDB() {
    // TODO: See if we need to reprovide or if it is done automatically with helia/libp2p.
    // TODO: See if we need to also provide the "file", we could be getting "banned" from the network.
    const cid = this.getDBAddressCID();

    // TODO: Find a better way to provide & reprovide the database.
    try {
      console.log("Providing database address...");
      const startTime = performance.now();
      await this.orbitdb.ipfs.routing.provide(cid);
      const endTime = performance.now();

      console.log(
        `Database address provided, took ${
          (endTime - startTime) / 1000
        } seconds`
      );
    } catch (error) {
      console.error("Error providing database:", error);
    }
  }

  private async startService(serviceFunction: () => Promise<void>) {
    // TODO: Find a better way to handle the service function. it should be stoppable.
    while (true) {
      try {
        await serviceFunction();
      } catch (error) {
        console.error("Error in service function:", error);
      }
      // Wait 60 seconds before running the service function again
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }

  private getDBAddressCID() {
    const [_, __, cid] = this.openDb.address.split("/");
    return CID.parse(cid);
  }
}

export class ArticleDatabase extends Database {}
