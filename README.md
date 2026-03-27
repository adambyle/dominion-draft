# Dominion Draft

Multiplayer Kingdom drafting app for the card game *Dominion*.

## Collecting data

The app needs to collect card data from the Dominion Strategy Wiki
([wiki.dominionstrategy.com](https://wiki.dominionstrategy.com)).

The Dominion Strategy Wiki is protected from bots by Anubis. You will need an API key to access
the API from a script. I do not know how to use such a key yet, so for now I have been ripping
the `anubis-cookie-auth` cookie from a browser request and setting it as an environment variable
(see [.env.example](.env.example)).

To collect the data, run the [wikiData.ts](scripts/wikiData.ts) script once
with the following command:

```bash
npm run wikidata
```

This will collect card data in a JSON file in the `data` directory.
