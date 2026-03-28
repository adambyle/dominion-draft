<script lang="ts">
    import { browser } from "$app/environment";
    import { enhance } from "$app/forms";
    import { onDestroy, onMount } from "svelte";
    let { data } = $props();
    let { me } = $derived(data);

    let nameEmpty = $state(false);
    let nameForm: HTMLFormElement;
    const LOCALSTORAGE_NAME = "domdraft-name";

    let newRooms: string[] = $state([]);
    let rooms = $derived(new Set([...data.rooms, ...newRooms]));
    let roomID = $state("");

    // Restoring name from local storage.
    let name = $derived.by(() => {
        if (!browser) {
            return me.name;
        }
        const localName = window.localStorage.getItem(LOCALSTORAGE_NAME);
        return me.isNew && localName ? localName : me.name;
    });
    $effect(() => {
        if (!browser || !name) {
            return;
        }
        if (me.isNew) {
            nameForm.requestSubmit();
        } else {
            window.localStorage.setItem(LOCALSTORAGE_NAME, me.name);
        }
    });

    // Listen for room creation.
    let events: EventSource;
    onMount(() => {
        events = new EventSource("/api/rooms");

        events.addEventListener("room-open", (e) => {
            const id: string = JSON.parse(e.data);
            newRooms.push(id);
        });

        events.addEventListener("room-close", (e) => {
            const id: string = JSON.parse(e.data);
            newRooms = newRooms.filter((room) => room != id);
        });
    });
    onDestroy(() => {
        events?.close();
    });
</script>

<h1>Dominion Draft</h1>
<form method="POST" action="?/namePlayer" bind:this={nameForm} use:enhance>
    <input type="hidden" name="uuid" value={me.uuid} />
    <label>
        Name
        <input
            type="text"
            name="name"
            value={name}
            onchange={() => {
                nameForm.requestSubmit();
            }}
            oninput={(ev) => {
                nameEmpty = !ev.currentTarget.value;
            }}
        />
    </label>
</form>

{#if name && !nameEmpty}
    <form method="POST" action="?/joinRoom" use:enhance>
        <input type="hidden" name="uuid" value={me.uuid} />
        <label>
            Room ID
            <input type="text" name="id" bind:value={roomID} required />
        </label>
        <label>
            <input
                type="submit"
                value={rooms.has(roomID) ? "Join" : "Create"}
                disabled={!roomID}
            />
        </label>
    </form>
{:else}
    <p>Please enter a name for yourself.</p>
{/if}
