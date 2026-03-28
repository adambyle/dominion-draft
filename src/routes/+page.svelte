<script lang="ts">
    import game from "$lib/data/game";

    const cards = Array.from(game.cards.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );
</script>

{#each cards as card}
    <p>{card.name}</p>
{/each}
