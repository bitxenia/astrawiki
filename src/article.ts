import {
  type OrbitDB,
  ComposedStorage,
  IPFSAccessController,
  IPFSBlockStorage,
  LRUStorage,
} from "@orbitdb/core";
import {
  VersionManager,
  compileTextFromVersions,
  Version,
  newVersion,
} from "@bitxenia/wiki-version-manager";

export class Article {
  articleName: string;
  orbitdb: OrbitDB;
  articleDB: any;
  initialized: boolean | undefined;
  versionManager: VersionManager;

  constructor(articleName: string, orbitdb: OrbitDB) {
    this.articleName = articleName;
    this.orbitdb = orbitdb;
    this.initialized = false;
  }

  public async initNew(content: string) {
    if (this.initialized) {
      return;
    }

    // Create the article database

    // TODO: The new database needs to stay accessible for the collaborators to replicate it.
    //       See how to achieve this or change the responsibility of creating the database to
    //       the collaborators nodes.
    //       Every change is made without confirmation that it was replicated to the collaborators.
    //       One way to mitigate this is to obligate to be connected to at least one provider.
    //       Blocking the creating and editing of articles if not connected to a provider.

    // We use the default storage, found in:
    // https://github.com/orbitdb/orbitdb/blob/d290032ebf1692feee1985853b2c54d376bbfc82/src/access-controllers/ipfs.js#L56
    const storage = await ComposedStorage(
      await LRUStorage({ size: 1000 }),
      await IPFSBlockStorage({ ipfs: this.orbitdb.ipfs, pin: true }),
    );

    const articleDb = await this.orbitdb.open(this.articleName, {
      AccessController: IPFSAccessController({
        write: ["*"],
        storage,
      }),
    });
    this.articleDB = articleDb;

    this.versionManager = new VersionManager();
    this.newContent(content);

    await this.setUpDbEvents();
    this.initialized = true;
    return this.articleDB.address.toString();
  }

  public async initExisting(articleAddress: string) {
    if (this.initialized) {
      return;
    }
    // TODO: Handle the case where the database doesn't exist.
    //       This could be happening if the database existed but the peer was offline.
    this.articleDB = await this.orbitdb.open(articleAddress);

    // TODO: Wait for replication to finish?

    // TODO: We should store the versions in a more efficient way.
    const versions: Version[] = [];
    for await (const record of this.articleDB.iterator()) {
      let version = JSON.parse(record.value);
      versions.push(version);
    }
    this.versionManager = new VersionManager(versions);
    await this.setUpDbEvents();
    this.initialized = true;
  }

  public getContent(articleVersionID?: string) {
    let branch: Version[] = [];
    if (articleVersionID) {
      branch = this.versionManager.getBranch(articleVersionID);
    } else {
      branch = this.versionManager.getMainBranch();
    }
    // Returns the text until the last version and the ID of the last version
    return compileTextFromVersions(branch);
  }

  public getVersions() {
    const mainBranch = new Set(
      this.versionManager.getMainBranch().map((version) => version.id),
    );

    return this.versionManager.getAllVersions().map((version: Version) => {
      return {
        id: version.id,
        date: version.date,
        parent: version.parent,
        mainBranch: mainBranch.has(version.id),
      };
    });
  }

  public getCurrentVersionID() {
    const mainBranch = this.versionManager.getMainBranch();
    if (mainBranch.length === 0) {
      throw new Error("No versions found");
    }
    return mainBranch[mainBranch.length - 1].id;
  }

  public async newContent(content: string, articleParentVersionID?: string) {
    let version: Version;
    if (!articleParentVersionID) {
      // It means this is the first version
      version = newVersion("", content, articleParentVersionID ?? null);
    } else {
      const changesUntilVersion = this.versionManager.getBranch(
        articleParentVersionID,
      );
      const oldText = compileTextFromVersions(changesUntilVersion);
      version = newVersion(oldText, content, articleParentVersionID);
    }

    this.versionManager.addVersion(version);
    await this.articleDB.add(JSON.stringify(version));
  }

  private async setUpDbEvents() {
    this.articleDB.events.on("update", async (entry) => {
      console.log(`New entry for article ${this.articleName}`);
    });
  }
}
