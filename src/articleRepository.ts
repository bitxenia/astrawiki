import { VersionID } from "@bitxenia/wiki-version-manager";
import { ArticleInfo } from "./index";
import { AstraDb } from "@bitxenia/astradb";
import { Article } from "./article";

export class ArticleRepository {
  wikiName: string;
  astraDb: AstraDb;
  lastVersionFetchedByArticle: Map<string, VersionID>;

  constructor(wikiName: string, astraDb: AstraDb) {
    this.wikiName = wikiName;
    this.astraDb = astraDb;
    this.lastVersionFetchedByArticle = new Map();
  }

  public async getArticle(
    articleName: string,
    articleVersionID?: string,
  ): Promise<ArticleInfo> {
    const articleChanges = await this.astraDb.get(articleName);
    const article = new Article(articleName, articleChanges, this.astraDb);

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
    const article = new Article(articleName, [], this.astraDb);
    await article.newContent(articleContent);
  }

  public async editArticle(
    articleName: string,
    newArticleContent: string,
  ): Promise<void> {
    const articleChanges = await this.astraDb.get(articleName);
    const article = new Article(articleName, articleChanges, this.astraDb);

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
    return this.astraDb.getAllKeys();
  }
}
