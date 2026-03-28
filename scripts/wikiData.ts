import process from "process";
import dotenv from "dotenv";
import he from "he";
import { writeFile } from "fs/promises";

dotenv.config({
  quiet: true,
});

// Enable async.
export {};

// Dominion Strategy Wiki MediaWiki API.
function urlRoot(root: "api" | "index"): string {
  return `https://wiki.dominionstrategy.com/${root}.php`;
}

// Steal an auth token from a browser cookie to bypass Anubis
// script-blocker.
const token = process.env.ANUBIS_TOKEN;
const cookie = `anubis-cookie-auth=${token}`;

async function wikiFetch(
  root: "api" | "index",
  params: URLSearchParams,
): Promise<any> {
  params.append("format", "json");
  params.append("formatversion", "2");
  const uri = `${urlRoot(root)}?${params}`;
  const res = await fetch(uri, {
    headers: {
      Cookie: cookie,
    },
  });
  return await res.json();
}

type Field = string | readonly [string, string];

const COMPONENT_FIELDS = [
  "_rowID",
  "Name",
  "Expansion",
  "Purpose",
  "Quantity",
  ["Cost_Coin", "Cost Coin"],
  ["Cost_Potion", "Cost Potion"],
  ["Cost_Debt", "Cost Debt"],
  ["Cost_Extra", "Cost Extra"],
  "Illustrator",
  "Art",
  "Image",
  "Instructions",
  ["Release_Date", "Release Date"],
] as const;

const SUBTABLE_FIELDS = ["_rowID", "_value", "_position"] as const;
const EDITION_FIELDS = [
  "_rowID",
  "Expansion",
  "Edition",
  "Size",
  ["Release_Date", "Release Date"],
  "Icon",
  "Art",
  "Image",
  "Rulebook",
] as const;
const EXPANSION_FIELDS = ["Name", "Ordering", "Latest"] as const;
const TYPE_FIELDS = ["Name", "Scope", "Introduced"] as const;

const TABLE_FIELDS = {
  Components: COMPONENT_FIELDS,
  Components__Edition: SUBTABLE_FIELDS,
  Components__Types: SUBTABLE_FIELDS,
  Editions: EDITION_FIELDS,
  Editions__Illustrator: SUBTABLE_FIELDS,
  Expansions: EXPANSION_FIELDS,
  Types: TYPE_FIELDS,
} as const;

type Table = keyof typeof TABLE_FIELDS;

type TableField<T extends Table> = (typeof TABLE_FIELDS)[T][number];

function requestFields<T extends Table>(table: T): string[] {
  const fields = TABLE_FIELDS[table];
  return fields.map((field) => (typeof field === "string" ? field : field[0]));
}

type ResponseField<F extends Field> = F extends string ? F : F[1];

type ResponseRecord<T extends Table> = {
  [K in ResponseField<TableField<T>>]: K extends "_value" ? [string] : string;
};

async function cargoExport<T extends Table>(
  table: T,
  offset = 0,
): Promise<ResponseRecord<T>[]> {
  const fields = requestFields(table).join(",");
  const params = new URLSearchParams({
    title: "Special:CargoExport",
    tables: table,
    limit: "max",
    offset: String(offset),
    fields,
  });
  const records = await wikiFetch("index", params);
  for (const record of records) {
    for (const prop in record) {
      if (typeof record[prop] === "string") {
        record[prop] = he.decode(record[prop]);
      }
    }
  }
  return records;
}

async function cargoExportAll<T extends Table>(
  table: T,
): Promise<ResponseRecord<T>[]> {
  const records: ResponseRecord<T>[] = [];
  let count;
  do {
    const offset = records.length;
    const page = await cargoExport(table, offset);
    records.push(...page);
    count = page.length;
  } while (count);
  return records;
}

interface Edition {
  icon: string;
  size: number;
  release: string;
  illustrators: string[];
  art: string;
  image: string;
  rulebook: string;
}

interface Expansion {
  name: string;
  ordering: number;
  editions: Edition[];
}

type CardTypeScope =
  | "Basic"
  | "Landscape"
  | "Multi-expansion"
  | "Single-expansion"
  | "Single-pile";

interface CardType {
  name: string;
  scope: CardTypeScope;
  introduced: string;
}

interface CardCost {
  coins: number;
  debt: number;
  potion: boolean;
  special: "+" | "*" | null;
}

type CardPurpose =
  | "Basic"
  | "Kingdom Pile"
  | "Landscape"
  | "Mixed Pile Card"
  | "Non-Supply"
  | "Status";

interface Card {
  name: string;
  purpose: CardPurpose;
  expansion: string;
  editions: (1 | 2)[];
  cardTypes: string[];
  cost: CardCost;
  quantity: number;
  illustrator: string;
  artURL: string;
  imageURL: string;
  instructionsHTML: string;
  release: string | null;
}

interface WikiData {
  expansions: Record<string, Expansion>;
  cardTypes: Record<string, CardType>;
  cards: Record<string, Card>;
}

async function getWikiData(): Promise<WikiData> {
  const requests = [
    cargoExportAll("Components"),
    cargoExportAll("Components__Edition"),
    cargoExportAll("Components__Types"),
    cargoExportAll("Editions"),
    cargoExportAll("Editions__Illustrator"),
    cargoExportAll("Expansions"),
    cargoExportAll("Types"),
  ] as const;
  const [
    componentRecords,
    componentEditionRecords,
    componentTypeRecords,
    editionRecords,
    editionIllustratorRecords,
    expansionRecords,
    typeRecords,
  ] = await Promise.all(requests);

  const expansions: Record<string, Expansion> = {};
  const editionsById: Record<string, Edition | undefined> = {};
  for (const rec of expansionRecords) {
    expansions[rec.Name] = {
      name: rec.Name,
      editions: [],
      ordering: Number.parseInt(rec.Ordering),
    };
  }
  for (const rec of editionRecords) {
    const idx = Number.parseInt(rec.Edition) - 1;
    const expansion = expansions[rec.Expansion];
    const edition: Edition = {
      icon: rec.Icon,
      size: Number.parseInt(rec.Size),
      release: rec["Release Date"],
      illustrators: [],
      art: rec.Art,
      image: rec.Image,
      rulebook: rec.Rulebook,
    };
    expansion.editions[idx] = edition;
    editionsById[rec._rowID] = edition;
  }
  for (const rec of editionIllustratorRecords) {
    const edition = editionsById[rec._rowID];
    const idx = Number.parseInt(rec._position) - 1;
    if (!edition) {
      // There are some stale rows.
      continue;
    }
    edition.illustrators[idx] = rec._value[0];
  }

  const cardTypes: Record<string, CardType> = {};
  for (const rec of typeRecords) {
    cardTypes[rec.Name] = {
      name: rec.Name,
      scope: rec.Scope as CardTypeScope,
      introduced: rec.Introduced,
    };
  }

  const cards: Record<string, Card> = {};
  const cardsById: Record<string, Card | undefined> = {};
  for (const rec of componentRecords) {
    const coins = rec["Cost Coin"];
    const debt = rec["Cost Debt"];
    const potion = rec["Cost Potion"];
    const extra = rec["Cost Extra"];
    const cost: CardCost = {
      coins: Number.parseInt(coins),
      debt: debt ? Number.parseInt(debt) : 0,
      potion: potion === "Yes",
      special: extra as "+" | "*" | null,
    };
    const card: Card = {
      name: rec.Name,
      cardTypes: [],
      cost,
      editions: [],
      expansion: rec.Expansion,
      quantity: Number.parseInt(rec.Quantity),
      illustrator: rec.Illustrator,
      artURL: rec.Art,
      imageURL: rec.Image,
      instructionsHTML: rec.Instructions,
      release: rec["Release Date"],
      purpose: rec.Purpose as CardPurpose,
    };
    cards[rec.Name] = card;
    cardsById[rec._rowID] = card;
  }
  for (const rec of componentEditionRecords) {
    const card = cardsById[rec._rowID];
    if (!card) {
      // There are some stale rows.
      continue;
    }
    const idx = Number.parseInt(rec._position) - 1;
    const edition = Number.parseInt(rec._value[0]);
    card.editions[idx] = edition as 1 | 2;
  }
  for (const rec of componentTypeRecords) {
    const card = cardsById[rec._rowID];
    if (!card) {
      // There are some stale rows.
      continue;
    }
    const idx = Number.parseInt(rec._position) - 1;
    card.cardTypes[idx] = rec._value[0];
  }

  return { cards, expansions, cardTypes };
}

console.log("Fetching data...");
const data = await getWikiData();
console.log("Saving data...");
await writeFile("data/wikidata.json", JSON.stringify(data, undefined, 2));
console.log("Done.");
