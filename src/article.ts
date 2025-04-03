import {
  VersionManager,
  compileTextFromVersions,
  Version,
  newVersion,
} from "@bitxenia/wiki-version-manager";
import { ArticleDatabase } from "./database/articleDatabase.js";

export class Article {
  articleName: string;
  articleDB: ArticleDatabase;
  versionManager: VersionManager;

  constructor(
    articleName: string,
    articleDB: ArticleDatabase,
    versions: Version[]
  ) {
    this.articleName = articleName;
    this.articleDB = articleDB;
    this.versionManager = new VersionManager(versions);
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
    await this.articleDB.addVersion(version);
  }
}
