import process from "process";
import dotenv from "dotenv";

dotenv.config({
  quiet: true,
});

export {};

// Dominion Strategy Wiki MediaWiki API.
const API_ROOT = "https://wiki.dominionstrategy.com/api.php";

const token = process.env.ANUBIS_TOKEN;
const cookie = `anubis-cookie-auth=${token}`;

interface MediaWikiError {
  error: {
    code: string;
    info: string;
    docref: string;
  };
}

type ComponentColumn =
  | "Name"
  | "Expansion"
  | "Edition"
  | "Purpose"
  | "Types"
  | "Quantity"
  | ["Cost_Coin", "Cost Coin"]
  | ["Cost_Potion", "Cost Potion"]
  | ["Cost_Debt", "Cost Debt"]
  | ["Cost_Extra", "Cost Extra"]
  | "Illustrator"
  | "Art"
  | "Image"
  | "Instructions"
  | ["Release_Date", "Release Date"];

const COMPONENT_FIELDS_BY_INCLUDE = {
  name: ["Name"],
  working: [
    // Some columns don't seem to be working from the API right now.
    "Name",
    "Expansion",
    "Purpose",
    ["Cost_Coin", "Cost Coin"],
    ["Cost_Potion", "Cost Potion"],
    ["Cost_Debt", "Cost Debt"],
    ["Cost_Extra", "Cost Extra"],
    "Image",
  ],
  full: [
    "Name",
    "Expansion",
    "Edition",
    "Purpose",
    "Types",
    ["Cost_Coin", "Cost Coin"],
    ["Cost_Potion", "Cost Potion"],
    ["Cost_Debt", "Cost Debt"],
    ["Cost_Extra", "Cost Extra"],
    "Image",
  ],
} as const satisfies Record<string, ComponentColumn[]>;

type ComponentInclude = keyof typeof COMPONENT_FIELDS_BY_INCLUDE;

function componentRequestFields(include: ComponentInclude) {
  return COMPONENT_FIELDS_BY_INCLUDE[include].map((field) => {
    if (typeof field === "string") {
      return field;
    } else {
      return field[0];
    }
  });
}

type StringOrSecondString<
  Arr extends readonly (string | readonly [string, string])[],
> = {
  [K in keyof Arr]: Arr[K] extends string ? Arr[K] : Arr[K][1];
};

interface ComponentRecord<I extends ComponentInclude> {
  title: Record<
    StringOrSecondString<(typeof COMPONENT_FIELDS_BY_INCLUDE)[I]>[number],
    string
  >;
}

interface ComponentResponse<I extends ComponentInclude> {
  cargoquery: ComponentRecord<I>[];
}

interface ParsePageResponse {
  parse: {
    title: string;
    pageid: number;
    wikitext: string;
  };
}

async function mediaWikiAPI(
  params: URLSearchParams,
): Promise<MediaWikiError | any> {
  const url = `${API_ROOT}?${params}`;
  const res = await fetch(url, {
    headers: {
      Cookie: cookie,
    },
  });
  return await res.json();
}

async function getComponents<I extends ComponentInclude>(
  include: I,
  offset = 0,
): Promise<MediaWikiError | ComponentResponse<I>> {
  const fields = componentRequestFields(include).join(",");
  const params = new URLSearchParams({
    action: "cargoquery",
    format: "json",
    tables: "Components",
    fields,
    limit: "max",
    offset: String(offset),
    formatversion: "2",
  });
  return await mediaWikiAPI(params);
}

async function getAllComponents<I extends ComponentInclude>(
  include: I,
): Promise<MediaWikiError | ComponentRecord<I>[]> {
  const allRecords: ComponentRecord<I>[] = [];
  let count: number;
  do {
    const offset = allRecords.length;
    const response = await getComponents(include, offset);
    if ("error" in response) {
      return response;
    }
    const records = response.cargoquery;
    allRecords.push(...records);
    count = records.length;
  } while (count);
  return allRecords;
}

async function parsePage(
  page: string,
): Promise<MediaWikiError | ParsePageResponse> {
  const params = new URLSearchParams({
    action: "parse",
    format: "json",
    page,
    prop: "wikitext",
    formatversion: "2",
  });
  return await mediaWikiAPI(params);
}

const allRecords = await getAllComponents("working");
if ("error" in allRecords) {
  console.log("Error:", allRecords);
} else {
  const record = allRecords[0];
  console.log(record.title);
}
