import { VersionID } from "@bitxenia/wiki-version-manager";
import { ArticleInfo } from "./index.js";
import { ArticleRepositoryDatabase } from "./database/articleRepositoryDatabase.js";
import { type OrbitDB } from "@orbitdb/core";

export class ArticleRepository {
  articleRepositoryDB: ArticleRepositoryDatabase;
  lastVersionFetchedByArticle: Map<string, VersionID>;

  constructor(orbitdb: OrbitDB, wikiName: string, isCollaborator: boolean) {
    this.articleRepositoryDB = new ArticleRepositoryDatabase(
      orbitdb,
      wikiName,
      isCollaborator,
    );
    this.lastVersionFetchedByArticle = new Map();
  }

  public async init() {
    await this.articleRepositoryDB.init();
  }

  public async getArticle(
    articleName: string,
    articleVersionID?: string,
  ): Promise<ArticleInfo> {
    const article = await this.articleRepositoryDB.getArticle(articleName);

    // Update the last version fetched.
    this.lastVersionFetchedByArticle.set(
      articleName,
      article.getCurrentVersionID(),
    );
    const articleContent = article.getContent(articleVersionID);
    const articleVersions = article.getVersions();
    return {
      name: articleName,
      content: articleContent,
      versionsInfo: articleVersions,
    };
  }

  public async newArticle(articleName: string, articleContent: string) {
    await this.articleRepositoryDB.addArticle(articleName, articleContent);
  }

  public async editArticle(
    articleName: string,
    newArticleContent: string,
  ): Promise<void> {
    const article = await this.articleRepositoryDB.getArticle(articleName);

    // TODO: See if somehow an edit to a not previously fetched article is possible.
    const lastVersionFetched =
      this.lastVersionFetchedByArticle.get(articleName);
    if (!lastVersionFetched) {
      throw Error(
        `Article ${articleName} was not previously fetched. Fetched articles: ${this.lastVersionFetchedByArticle.keys()}`,
      );
    }
    await article.newContent(newArticleContent, lastVersionFetched);
  }

  public async getArticleList(): Promise<string[]> {
    return Array.from(this.articleRepositoryDB.articleNames.keys());
  }
}
