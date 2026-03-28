# Dominion Draft

Multiplayer Kingdom drafting app for the card game *Dominion*.

## Collecting data

The app needs to collect card data from the Dominion Strategy Wiki
([wiki.dominionstrategy.com](https://wiki.dominionstrategy.com)).

The Dominion Strategy Wiki is protected from bots by Anubis. You will need an API key to access
the API from a script, which you must obtain from a community member. Set the
`CLIENT_TOKEN` environment variable to the provided key.

To collect the data, run the [wikiData.ts](scripts/wikiData.ts) script once
with the following command:

```bash
npm run wikidata
```

This will collect card data in a JSON file in the `src/lib/data` directory.
