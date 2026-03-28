import { roomEmitter } from "$lib/server/rooms";

export const GET = ({ request }) => {
  let onOpen: (id: string) => void;
  let onClose: (id: string) => void;
  function removeListeners() {
    roomEmitter.off("room-open", onOpen);
    roomEmitter.off("room-close", onClose);
  }
  const stream = new ReadableStream({
    start(controller) {
      onOpen = (id) => {
        controller.enqueue(`event: room-open\ndata: "${id}"\n\n`);
      };
      onClose = (id) => {
        controller.enqueue(`event: room-close\ndata: "${id}"\n\n`);
      };
      roomEmitter.on("room-open", onOpen);
      roomEmitter.on("room-close", onClose);

      request.signal.addEventListener("abort", removeListeners);
    },
    cancel() {
      removeListeners();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
};
