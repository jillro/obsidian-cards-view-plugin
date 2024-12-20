import { parser } from "./grammar.js";
import { type Tree, TreeCursor } from "lezer-tree";
import assert from "assert";
import type { TFile } from "obsidian";

type FilterFn = (params: {
  file?: TFile;
  content?: string;
  tags?: string[]; // Without the # prefix
  frontmatter?: object;
  caseSensitive?: boolean;
}) => Promise<boolean>;

type PropertyFilterFn<K extends string = string> = (params: {
  key: K;
  frontmatter?: Record<K, string>;
  caseSensitive?: boolean;
}) => Promise<boolean>;

function getAndFilter(input: string, cursor: TreeCursor): FilterFn {
  const filters: FilterFn[] = [];
  if (!cursor.firstChild()) {
    return async () => true;
  }
  filters.push(getExpressionFilter(input, cursor));
  while (cursor.nextSibling()) {
    filters.push(getExpressionFilter(input, cursor));
  }

  cursor.parent();
  return async (params) =>
    (await Promise.all(filters.map((filter) => filter(params)))).every(Boolean);
}

function getOrFilter(input: string, cursor: TreeCursor): FilterFn {
  const filters: FilterFn[] = [];
  if (!cursor.firstChild()) {
    return async () => true;
  }
  filters.push(getExpressionFilter(input, cursor));
  while (cursor.nextSibling()) {
    filters.push(getExpressionFilter(input, cursor));
  }

  cursor.parent();
  return async (params) =>
    (await Promise.all(filters.map((filter) => filter(params)))).some(Boolean);
}

function getPropertyValueFilter(
  input: string,
  cursor: TreeCursor,
): PropertyFilterFn {
  cursor.firstChild();
  if (cursor.node.type.name === "PropertyValueOr") {
    const filters: PropertyFilterFn[] = [];
    cursor.firstChild();
    filters.push(getPropertyValueFilter(input, cursor));
    while (cursor.nextSibling()) {
      filters.push(getPropertyValueFilter(input, cursor));
    }
    cursor.parent();
    cursor.parent();
    return async (params) =>
      (await Promise.all(filters.map((filter) => filter(params)))).some(
        Boolean,
      );
  }

  if (cursor.node.type.name === "PropertyValueExpression") {
    const filter = getPropertyValueFilter(input, cursor);
    cursor.parent();
    return filter;
  }

  // type is text
  const termFilter = getTermFilter(input, cursor);
  cursor.parent();
  return async <K extends string>({
    key,
    frontmatter,
    caseSensitive,
  }: {
    key: K;
    frontmatter?: Record<K, string>;
    caseSensitive?: boolean;
  }) =>
    Boolean(
      frontmatter &&
        (await termFilter({ content: frontmatter[key], caseSensitive })),
    );
}

function getTermFilter(input: string, cursor: TreeCursor): FilterFn {
  if (cursor.node.type.name === "Word" || cursor.node.type.name === "Quote") {
    const value =
      cursor.node.type.name === "Quote"
        ? input.slice(cursor.node.from + 1, cursor.node.to - 1)
        : input.slice(cursor.node.from, cursor.node.to);
    return async ({
      file,
      content,
      caseSensitive,
    }: {
      file?: TFile;
      content?: string;
      caseSensitive?: boolean;
    }) =>
      Boolean(
        content &&
          (caseSensitive
            ? content.includes(value)
            : content.toLowerCase().includes(value.toLowerCase())),
      ) ||
      Boolean(
        file &&
          file.name &&
          (caseSensitive
            ? file.name.includes(value)
            : file.name.toLowerCase().includes(value.toLowerCase())),
      );
  }

  if (cursor.node.type.name === "Regex") {
    const value = input.slice(cursor.node.from + 1, cursor.node.to - 1);
    const regex = new RegExp(value);
    return async ({ file, content }: { file?: TFile; content?: string }) =>
      Boolean(content && regex.test(content)) ||
      Boolean(file && file.name && regex.test(file.name));
  }

  if (cursor.node.type.name === "FileOperator") {
    if (!cursor.firstChild()) {
      return async () => true;
    }
    const termFilter = getTermFilter(input, cursor);
    cursor.parent();
    return async ({
      file,
      caseSensitive,
    }: {
      file?: TFile;
      caseSensitive?: boolean;
    }) =>
      Boolean(
        file &&
          file.name &&
          (await termFilter({ content: file.name, caseSensitive })),
      );
  }

  if (cursor.node.type.name === "PathOperator") {
    if (!cursor.firstChild()) {
      return async () => true;
    }
    const termFilter = getTermFilter(input, cursor);
    cursor.parent();
    return async ({
      file,
      caseSensitive,
    }: {
      file?: TFile;
      caseSensitive?: boolean;
    }) =>
      Boolean(
        file &&
          file.path &&
          (await termFilter({ content: file.path, caseSensitive })),
      );
  }

  if (cursor.node.type.name === "ContentOperator") {
    if (!cursor.firstChild()) {
      return async () => true;
    }
    const termFilter = getTermFilter(input, cursor);
    cursor.parent();
    return async ({
      content,
      caseSensitive,
    }: {
      content?: string;
      caseSensitive?: boolean;
    }) => Boolean(content && (await termFilter({ content, caseSensitive })));
  }

  if (cursor.node.type.name === "MatchCaseOperator") {
    if (!cursor.firstChild()) {
      return async () => true;
    }
    const termFilter = getTermFilter(input, cursor);
    cursor.parent();
    return async ({ content }: { content?: string }) =>
      Boolean(content && (await termFilter({ content, caseSensitive: true })));
  }

  if (cursor.node.type.name === "IgnoreCaseOperator") {
    if (!cursor.firstChild()) {
      return async () => true;
    }
    const termFilter = getTermFilter(input.toLowerCase(), cursor);
    cursor.parent();
    return async ({ content }: { content?: string }) =>
      Boolean(content && termFilter({ content: content.toLowerCase() }));
  }

  if (cursor.node.type.name === "TagOperator") {
    const value = input
      .slice(cursor.node.from, cursor.node.to)
      .replace(/^tag:/, "")
      .replace(/^#/, "");
    return async ({
      tags,
      caseSensitive,
    }: {
      tags?: string[];
      caseSensitive?: boolean;
    }) => {
      return Boolean(
        tags &&
          (caseSensitive
            ? tags.includes(value)
            : tags.map((t) => t.toLowerCase()).includes(value.toLowerCase())),
      );
    };
  }

  if (cursor.node.type.name === "LineOperator") {
    if (!cursor.firstChild()) {
      return async () => true;
    }
    const termFilter = getExpressionFilter(input, cursor);
    cursor.parent();
    return async ({
      content,
      caseSensitive,
    }: {
      content?: string;
      caseSensitive?: boolean;
    }) =>
      Boolean(
        content &&
          (
            await Promise.all(
              content
                .split("\n")
                .map((line) => termFilter({ content: line, caseSensitive })),
            )
          ).some(Boolean),
      );
  }

  if (cursor.node.type.name === "PropertyOperator") {
    if (!cursor.firstChild()) {
      return async () => true;
    }
    // @ts-ignore
    assert(cursor.node.type.name === "PropertyName");
    const propertyName = input.slice(cursor.node.from, cursor.node.to);

    // d'abord filter toutes les propriétés qui matchent
    // puis filter par leurs valeurs

    let propertyValueFilter: PropertyFilterFn<typeof propertyName> = async () =>
      true;
    if (cursor.nextSibling()) {
      assert(cursor.node.type.name === "PropertyValueExpression");
      propertyValueFilter = getPropertyValueFilter(input, cursor);
    }

    cursor.parent();
    return async ({
      frontmatter,
      caseSensitive,
    }: {
      frontmatter?: object;
      caseSensitive?: boolean;
    }) => {
      if (!frontmatter) return false;

      const matchingProperties = Object.keys(frontmatter).filter((k) =>
        caseSensitive
          ? k.includes(propertyName)
          : k.toLowerCase().includes(propertyName.toLowerCase()),
      );

      if (matchingProperties.length === 0) return false;

      return (
        await Promise.all(
          matchingProperties.map(async (k) =>
            propertyValueFilter({
              key: k,
              frontmatter: frontmatter as Record<typeof propertyName, string>,
              caseSensitive,
            }),
          ),
        )
      ).some(Boolean);
    };
  }

  cursor.parent();
  return async () => true;
}

function getExpressionFilter(input: string, cursor: TreeCursor): FilterFn {
  if (cursor.node.type.name === "And") {
    return getAndFilter(input, cursor);
  }

  if (cursor.node.type.name === "Or") {
    return getOrFilter(input, cursor);
  }

  if (cursor.node.type.name === "Not") {
    cursor.firstChild();
    const filter = getExpressionFilter(input, cursor);
    cursor.parent();
    return async (params) => !(await filter(params));
  }

  return getTermFilter(input, cursor);
}

export default function generateFilter(input: string): FilterFn {
  const tree: Tree = parser.parse(input);
  const cursor = tree.cursor();
  if (!cursor.firstChild()) {
    return async () => true;
  }

  return getExpressionFilter(input, cursor);
}
