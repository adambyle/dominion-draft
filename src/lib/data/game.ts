import {
  cards as rawCards,
  cardTypes as rawCardTypes,
  expansions as rawExpansions,
} from "$lib/data/wikidata.json";

export interface Edition {
  iconURL: string;
}

export class Expansion {
  name: string;
  editions: Edition[];
  ordering: number;

  constructor({ name, editions, ordering }: any) {
    this.name = name;
    this.editions = editions;
    this.ordering = ordering;
  }
}

export type CardTypeScope =
  | "Basic"
  | "Landscape"
  | "Multi-expansion"
  | "Single-expansion"
  | "Single-pile";

export class CardType {
  name: string;
  scope: CardTypeScope;
  introduced: Expansion;

  constructor(
    { name, scope, introduced }: any,
    expansionsByName: Map<string, Expansion>,
  ) {
    this.name = name;
    this.scope = scope;
    this.introduced = expansionsByName.get(introduced)!;
  }
}

export type SpecialCost = "+" | "*";

export interface CardCost {
  coins: number;
  debt: number;
  potion: boolean;
  special: SpecialCost | null;
}

export type CardPurpose =
  | "Basic"
  | "Kingdom Pile"
  | "Landscape"
  | "Mixed Pile Card"
  | "Non-Supply"
  | "Status";

export class Card {
  name: string;
  purpose: CardPurpose;
  cost: CardCost;
  cardTypes: CardType[];
  expansion: Expansion;
  editions: (1 | 2)[];
  imageURL: string;

  constructor(
    { name, purpose, cost, cardTypes, expansion, editions, imageURL }: any,
    cardTypesByName: Map<string, CardType>,
    expansionsByName: Map<string, Expansion>,
  ) {
    this.name = name;
    this.purpose = purpose;
    this.cost = cost;
    this.cardTypes = cardTypes.map(
      (cardType: string) => cardTypesByName.get(cardType)!,
    );
    this.expansion = expansionsByName.get(expansion)!;
    this.editions = editions;
    this.imageURL = imageURL;
  }
}

export interface GameComponents {
  cards: Map<string, Card>;
  cardTypes: Map<string, CardType>;
  expansions: Map<string, Expansion>;
}

const game: GameComponents = {
  cards: new Map(),
  cardTypes: new Map(),
  expansions: new Map(),
};
for (const name in rawExpansions) {
  game.expansions.set(
    name,
    new Expansion(rawExpansions[name as keyof typeof rawExpansions]),
  );
}
for (const name in rawCardTypes) {
  game.cardTypes.set(
    name,
    new CardType(
      rawCardTypes[name as keyof typeof rawCardTypes],
      game.expansions,
    ),
  );
}
for (const name in rawCards) {
  game.cards.set(
    name,
    new Card(
      rawCards[name as keyof typeof rawCards],
      game.cardTypes,
      game.expansions,
    ),
  );
}

export default game;
