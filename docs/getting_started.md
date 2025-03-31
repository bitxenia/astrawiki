# Getting Started

This guide will help you get up and running with a simple Astrawiki wiki that you can colaborate across multiple peers.

The Astrawiki node can be used in a Node.js environment or in the browser. This guide will focus on the Node.js environment, but the same principles apply to the browser, except if mentioned otherwise.

## Install

Install Astrawiki:

```sh
npm install @bitxenia/astrawiki
```

## Connecting to a wiki

Astrawiki is a decentralized wiki. This means that there is no central server or database. Instead, the wiki is distributed across multiple colaborator peers, each of which has its own copy of the wiki.

To connect to an existing wiki, you will need to know its unique wiki name. For example, to connect to the Bitxenia wiki you would use the name `bitxenia-wiki`.

Assuming you have a Node.js development environment installed, create a new project using the command line:

```sh
mkdir astrawiki
cd astrawiki
npm init
npm i @bitxenia/astrawiki
```

Create a file in your project called index.js and add the following code to it:

```ts
import { createAstrawikiNode } from "@bitxenia/astrawiki";

const node = await createAstrawikiNode({
  wikiName: "bitxenia-wiki",
});

const articleList = await node.getArticleList();
console.log(articleList);
```

Run index.js to connect your new Astrawiki node to the Bitxenia wiki:

```sh
node index.js
```

Congrats! After succesfully connecting, you should see the list of all articles present in the wiki.

## Fetching an article

To fetch an article from the wiki, you can use the `getArticle` method. This method takes the article name as an argument and returns the article content.

You can choose any article name from the list of articles you fetched in the previous step.

For example, to fetch the article `Argentina`, you would use the following code:

```ts
const node = await createAstrawikiNode({
  wikiName: "bitxenia-wiki",
});
const articleName = "Argentina";
const article = await node.getArticle(articleName);
console.log(article.content);
```

You should now see the content of the article printed to the console.

Articles are represented as `ArticleInfo` objects, which contain the following properties:

```ts
type ArticleInfo = {
  name: string;
  content: string;
  versionsInfo: VersionInfo[];
};
```

Articles are stored with a version history. The `versionsInfo` property contains an array of `VersionInfo` objects, which contain the following properties:

```ts
type VersionInfo = {
  id: string;
  date: string;
  parent: string | null;
  mainBranch: boolean;
};
```

Because we are using OrbitDB, articles are stored in a decentralized manner with eventual consistency, meaning that changes made to an article will eventually propagate to all peers in the wiki.

Because of this, articles may have multiple branches of history, if, for example, multiple peers are making changes to the same article at the same time.

The `mainBranch` property indicates whether the version is part of the main branch of the article's history. The last version in the main branch is the most recent version of the branch chosen to be the main, and its content is the one that will be returned when you call `getArticle`.

To learn how the main branch is chosen you can read the architecture docs.

To get the content of a specific version of an article, you can use the `getArticle` method with the `articleVersionID` parameter. For example:

```ts
const node = await createAstrawikiNode({
  wikiName: "bitxenia-wiki",
});
const articleName = "Argentina";
const article = await node.getArticle(articleName);

const previousArticleVersionID =
  article.versionsInfo[article.versionsInfo.length - 2].id;
const previousArticleVersion = await node.getArticle(
  articleName,
  previousArticleVersionID
);
console.log(previousArticleVersion.content);
```

You should now see the content of the article at the specified version printed to the console.

## Creating and editing articles

Now let's create and edit a new article.

To create a new article, you can use the `createArticle` method. This method takes the article name and content as arguments. For example:

```ts
const node = await createAstrawikiNode({
  wikiName: "bitxenia-wiki",
});
const articleName = "Carl Sagan";
const articleContent =
  "# Carl Sagan\n\nCarl Saggan was an American astronomer, cosmologist, astrophysicist, and author.";
await node.createArticle(articleName, articleContent);
console.log("Article created!");
```

You should now see an error message, but don't worry, this is expected. The "Carl Sagan" article already existed in the wiki, so another article with the same name cannot be created.

If you want to create a new article, you can think of a cool thing that doesn't exist in the wiki yet.

For the sake of this example, let's asume that the article "Carl Sagan" doesn't exist in the wiki. If we look again we can see we made a typo when writting the content, let's replace "Saggan" with "Sagan".

To edit an article, you can use the `editArticle` method. This method takes the article name and new content as arguments. For example:

```ts
const node = await createAstrawikiNode({
  wikiName: "bitxenia-wiki",
});
const articleName = "Carl Sagan";
const articleContent =
  "# Carl Sagan\n\nCarl Sagan was an American astronomer, cosmologist, astrophysicist, and author.";
await node.editArticle(articleName, articleContent);
console.log("Article edited!");
```

You should now see the article "Carl Sagan" created in the wiki with the new content.

**PLEASE NOTE:**

Changes made to the wiki and articles are not confirmed to be commited when the methods `createArticle` and `editArticle` return. This is because orbitdb is a decentralized and eventually consistent database, meaning that changes are first made locally and will eventually propagate to all colaborator peers.
To learn more about this you can read the architecture docs.
