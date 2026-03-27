import process from "process";
import dotenv from "dotenv";

dotenv.config();

export {};

// Dominion Strategy Wiki MediaWiki API.
const API_ROOT = "https://wiki.dominionstrategy.com/api.php";

const token = process.env.ANUBIS_TOKEN;
const cookie = `anubis-cookie-auth=${token}`;

const params = new URLSearchParams({
  action: "cargoquery",
  format: "json",
  tables: "Components",
  fields: "Name",
  formatversion: "2",
});

async function fetchData() {
  const url = `${API_ROOT}?${params}`;
  const res = await fetch(url, {
    headers: {
      Cookie: cookie,
    },
  });
  return await res.text();
}

console.log(await fetchData());
