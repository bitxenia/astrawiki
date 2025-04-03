import { OrbitDB } from "@orbitdb/core";
import { Database } from "./database.js";
import { Version } from "@bitxenia/wiki-version-manager";

export class ArticleDatabase extends Database {
  wikiName: string;
  articleName: string;

  private async init(orbitdb: OrbitDB, wikiName: string, articleName: string) {
    this.orbitdb = orbitdb;
    this.wikiName = wikiName;
    this.articleName = articleName;

    // TODO: Find a better protocol to name the article, current protocol:
    // "<wiki-name>::<article-name>"
    this.openDb = await this.createDatabase(`${wikiName}::${articleName}`);
  }

  public async initNew(
    orbitdb: OrbitDB,
    wikiName: string,
    articleName: string
  ) {
    await this.init(orbitdb, wikiName, articleName);
  }

  public async initExisting(
    orbitdb: OrbitDB,
    wikiName: string,
    articleName: string
  ) {
    await this.init(orbitdb, wikiName, articleName);
    await this.syncDb();
  }

  public async getVersions(): Promise<Version[]> {
    // TODO: We should store the versions in a more efficient way.
    const versions: Version[] = [];
    for await (const record of this.openDb.iterator()) {
      let version = JSON.parse(record.value);
      versions.push(version);
    }
    return versions;
  }

  public async addVersion(version: Version): Promise<void> {
    await this.openDb.add(JSON.stringify(version));
  }
}
