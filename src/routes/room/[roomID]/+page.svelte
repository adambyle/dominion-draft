<script lang="ts">
    let { params } = $props();

    // TODO handle:
    // - Not in a room (redirect to home page with default room value as query param?).
    // - In a room other than this one.
</script>

<h1>Hello room {params.roomID}</h1>
