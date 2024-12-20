import { describe, test } from "node:test";
import assert from "assert";
import { parser } from "./grammar.js";
import type { Tree } from "lezer-tree";
import generateFilter from "./search";
import type { TFile } from "obsidian";

describe("search", async () => {
  await describe("parser", async () => {
    await test("lorem", () => {
      const query = "lorem";
      const tree: Tree = parser.parse(query);
      const cursor = tree.cursor();
      assert.equal(cursor.type.name, "Program");
      assert.equal(cursor.firstChild(), true);
      assert.equal(cursor.node.type.name, "And");
      assert.equal(cursor.firstChild(), true);
      assert.equal(cursor.node.type.name, "Word");
      assert.equal(query.slice(cursor.node.from, cursor.node.to), "lorem");
    });

    await test("lorem OR ipsum", () => {
      const query = "lorem OR ipsum";
      const tree: Tree = parser.parse(query);
      const cursor = tree.cursor();
      assert.equal(cursor.type.name, "Program");
      assert.equal(cursor.firstChild(), true);
      assert.equal(cursor.node.type.name, "Or");
      assert.equal(cursor.firstChild(), true);
      assert.equal(cursor.node.type.name, "And");
      assert.equal(cursor.firstChild(), true);
      assert.equal(cursor.node.type.name, "Word");
      assert.equal(query.slice(cursor.node.from, cursor.node.to), "lorem");
      assert.equal(cursor.parent(), true);
      assert.equal(cursor.nextSibling(), true);
      assert.equal(cursor.node.type.name, "And");
      assert.equal(cursor.firstChild(), true);
      assert.equal(cursor.node.type.name, "Word");
      assert.equal(query.slice(cursor.node.from, cursor.node.to), "ipsum");
    });
  });

  await describe("generateFilter", async () => {
    await test("lorem", async () => {
      const query = "lorem";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), true);
      assert.equal(await filter({ content: "Lorem" }), true);
      assert.equal(await filter({ content: "ipsum" }), false);
    });

    await test("-lorem", async () => {
      const query = "-lorem";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), false);
      assert.equal(await filter({ content: "Lorem" }), false);
      assert.equal(await filter({ content: "ipsum" }), true);
    });

    await test("lorem ipsum OR dolor sic", async () => {
      const query = "lorem ipsum OR dolor sic";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), true);
      assert.equal(await filter({ content: "dolor sic" }), true);
    });

    await test("lorem in filename", async () => {
      const query = "lorem";
      const filter = generateFilter(query);
      assert.equal(
        await filter({ file: { name: "lorem ipsum" } as TFile, content: "" }),
        true,
      );
    });

    await test("lorem ipsum", async () => {
      const query = "lorem ipsum";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "ipsum lorem" }), true);
      assert.equal(await filter({ content: "lorem" }), false);
    });

    await test("lorem OR ipsum", async () => {
      const query = "lorem OR ipsum";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), true);
      assert.equal(await filter({ content: "ipsum" }), true);
      assert.equal(await filter({ content: "lorem" }), true);
      assert.equal(await filter({ content: "dolor" }), false);
    });

    await test("-(lorem OR ipsum)", async () => {
      const query = "-(lorem OR ipsum)";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), false);
      assert.equal(await filter({ content: "ipsum" }), false);
      assert.equal(await filter({ content: "lorem" }), false);
      assert.equal(await filter({ content: "dolor" }), true);
    });

    await test("lorem -(ipsum OR dolor)", async () => {
      const query = "lorem -(ipsum OR dolor)";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem" }), true);
      assert.equal(await filter({ content: "lorem ipsum" }), false);
      assert.equal(await filter({ content: "lorem dolor" }), false);
      assert.equal(await filter({ content: "sic amet" }), false);
    });

    await test("lorem ipsum OR dolor", async () => {
      const query = "lorem ipsum OR dolor";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "ipsum lorem" }), true);
      assert.equal(await filter({ content: "dolor" }), true);
      assert.equal(await filter({ content: "lorem" }), false);
    });

    await test('"lorem ipsum"', async () => {
      const query = '"lorem ipsum"';
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), true);
      assert.equal(await filter({ content: "ipsum lorem" }), false);
    });

    await test('"lorem ipsum" OR dolor', async () => {
      const query = '"lorem ipsum" OR dolor';
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), true);
      assert.equal(await filter({ content: "dolor" }), true);
      assert.equal(await filter({ content: "ipsum lorem" }), false);
    });

    await test("/(lorem|ipsum)/", async () => {
      const query = "/(lorem|ipsum)/";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), true);
      assert.equal(await filter({ content: "ipsum lorem" }), true);
      assert.equal(await filter({ content: "dolor" }), false);
    });

    await test("file:.jpg", async () => {
      const query = "file:.jpg";
      const filter = generateFilter(query);
      assert.equal(
        await filter({ file: { name: "lorem.jpg" } as TFile, content: "" }),
        true,
      );
      assert.equal(
        await filter({ file: { name: "lorem.png" } as TFile, content: "" }),
        false,
      );
    });

    await test("file:.jpg OR lorem", async () => {
      const query = "file:.jpg OR lorem";
      const filter = generateFilter(query);
      assert.equal(
        await filter({ file: { name: "dolor.jpg" } as TFile, content: "" }),
        true,
      );
      assert.equal(
        await filter({ file: { name: "dolor.png" } as TFile, content: "" }),
        false,
      );
      assert.equal(
        await filter({
          file: { name: "dolor.png" } as TFile,
          content: "lorem",
        }),
        true,
      );
    });

    await test("path:lorem/ipsum", async () => {
      const query = "path:lorem/ipsum";
      const filter = generateFilter(query);
      assert.equal(
        await filter({ file: { path: "lorem/ipsum/" } as TFile, content: "" }),
        true,
      );
      assert.equal(
        await filter({ file: { path: "lorem/dolor" } as TFile, content: "" }),
        false,
      );
    });

    await test('path:"lorem ipsum"', async () => {
      const query = 'path:"lorem ipsum"';
      const filter = generateFilter(query);
      assert.equal(
        await filter({ file: { path: "lorem ipsum/" } as TFile, content: "" }),
        true,
      );
      assert.equal(
        await filter({ file: { path: "/lorem/dolor" } as TFile, content: "" }),
        false,
      );
    });

    await test('content:"lorem ipsum"', async () => {
      const query = 'content:"lorem ipsum"';
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), true);
      assert.equal(await filter({ content: "ipsum lorem" }), false);
    });

    await test("match-case:Lorem", async () => {
      const query = "match-case:Lorem";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "Lorem ipsum" }), true);
      assert.equal(await filter({ content: "lorem ipsum" }), false);
    });

    await test("ignore-case:Lorem", async () => {
      const query = "ignore-case:Lorem";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "Lorem ipsum" }), true);
      assert.equal(await filter({ content: "lorem ipsum" }), true);
    });

    await test("line:(lorem ipsum)", async () => {
      const query = "line:(lorem ipsum)";
      const filter = generateFilter(query);
      assert.equal(await filter({ content: "lorem ipsum" }), true);
      assert.equal(await filter({ content: "lorem\nipsum" }), false);
    });

    await test("tag:lorem", async () => {
      const query = "tag:lorem";
      const filter = generateFilter(query);
      assert.equal(await filter({ tags: ["lorem"] }), true);
      assert.equal(await filter({ tags: ["ipsum"] }), false);
    });

    await test("tag:#lorem", async () => {
      const query = "tag:#lorem";
      const filter = generateFilter(query);
      assert.equal(await filter({ tags: ["lorem"] }), true);
      assert.equal(await filter({ tags: ["ipsum"] }), false);
    });

    await test("[lorem]", async () => {
      const query = "[lorem]";
      const filter = generateFilter(query);
      assert.equal(await filter({ frontmatter: { lorem: true } }), true);
      assert.equal(await filter({ frontmatter: { ipsum: true } }), false);
    });

    await test("[lorem:ipsum]", async () => {
      const query = "[lorem:ipsum]";
      const filter = generateFilter(query);
      assert.equal(await filter({ frontmatter: { lorem: "ipsum" } }), true);
      assert.equal(await filter({ frontmatter: { lorem: "lorem" } }), false);
      assert.equal(await filter({ frontmatter: { lorem: "dolor" } }), false);
      assert.equal(await filter({ frontmatter: { ipsum: "ipsum" } }), false);
    });

    await test("[lorem:ipsum OR dolor]", async () => {
      const query = "[lorem:ipsum OR dolor]";
      const filter = generateFilter(query);
      assert.equal(await filter({ frontmatter: { lorem: "ipsum" } }), true);
      assert.equal(await filter({ frontmatter: { lorem: "dolor" } }), true);
      assert.equal(await filter({ frontmatter: { lorem: "lorem" } }), false);
    });
  });
});
