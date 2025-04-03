import {
  type OrbitDB,
  ComposedStorage,
  IPFSAccessController,
  IPFSBlockStorage,
  LRUStorage,
} from "@orbitdb/core";

export class Database {
  orbitdb: OrbitDB;
  openDb: any;

  constructor(orbitdb: OrbitDB) {
    this.orbitdb = orbitdb;
  }

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
    const onJoin = async (peerId: any, heads: any) => {
      synced = true;
    };
    // We use the join event to know when an exchange of heads (sync) happened between peers.
    // https://api.orbitdb.org/module-Sync-Sync.html#event:join
    this.openDb.events.on("join", onJoin);

    // TODO: Maybe there is a race condition here, we should check if the event already fired.
    // Check if the database is already synced by looking at the entries could not work because
    // the database could not be empty locally and not synced with the providers.

    try {
      await this.waitFor(
        async () => synced,
        async () => true
      );
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

    return new Promise<void>((resolve, reject) => {
      let elapsedTime = 0;

      const interval = setInterval(async () => {
        if ((await valueA()) === (await toBeValueB())) {
          clearInterval(interval);
          resolve();
        }
        elapsedTime += pollInterval;

        if (elapsedTime >= timeout) {
          clearInterval(interval);
          reject(new Error("Timeout waiting for condition"));
        }
      }, pollInterval);
    });
  }
}
