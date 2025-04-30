import {
  VersionManager,
  compileTextFromVersions,
  Version,
  newVersion,
} from "@bitxenia/wiki-version-manager";
import { AstraDb } from "@bitxenia/astradb";

export class Article {
  articleName: string;
  astraDb: AstraDb;
  versionManager: VersionManager;

  constructor(articleName: string, articleChanges: string[], astraDb: AstraDb) {
    this.articleName = articleName;
    this.astraDb = astraDb;
    this.versionManager = new VersionManager(
      this.constructVersions(articleChanges)
    );
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
      this.versionManager.getMainBranch().map((version) => version.id)
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
        articleParentVersionID
      );
      const oldText = compileTextFromVersions(changesUntilVersion);
      version = newVersion(oldText, content, articleParentVersionID);
    }

    this.versionManager.addVersion(version);
    await this.astraDb.add(this.articleName, JSON.stringify(version));
  }

  private constructVersions(articleChanges: string[]): Version[] {
    const versions: Version[] = [];
    for (const change of articleChanges) {
      let version = JSON.parse(change);
      versions.push(version);
    }
    return versions;
  }
}
