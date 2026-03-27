# Dominion Draft

Multiplayer Kingdom drafting app for the card game *Dominion*.

## Collecting data

The app needs to collect card data from the Dominion Strategy Wiki ([wiki.dominionstrategy.com](https://wiki.dominionstrategy.com)).

To do so, run the [scripts/wikiData.ts] script once with the following command:

```bash
npm run wikidata
```

This will collect card data in a JSON file in the `data` directory.
