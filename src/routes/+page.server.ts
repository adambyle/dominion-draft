import { goto } from "$app/navigation";
import {
  getOrCreateRoom,
  getRooms,
  joinRoom,
  renamePlayer,
} from "$lib/server/rooms";
import { fail, redirect } from "@sveltejs/kit";

export const actions = {
  async namePlayer({ request }) {
    const formData = await request.formData();
    const uuid = formData.get("uuid");
    const name = formData.get("name");
    if (typeof uuid !== "string") {
      return fail(400, { bad: "uuid" });
    }
    if (typeof name !== "string") {
      return fail(400, { bad: "name" });
    }
    const player = renamePlayer(uuid, name);
    if (!player) {
      return fail(404, { uuid });
    }
    return { success: true };
  },
  async joinRoom({ request }) {
    // TODO handle player already joined room; and room full.
    const formData = await request.formData();
    const uuid = formData.get("uuid");
    const roomID = formData.get("id");
    if (typeof uuid !== "string") {
      return fail(400, { bad: "uuid" });
    }
    if (typeof roomID !== "string") {
      return fail(400, { bad: "roomID" });
    }
    const room = getOrCreateRoom(roomID, 6 /* TODO */);
    if (!room) {
      return fail(400, { bad: "roomID" });
    }
    const success = joinRoom(uuid, room.id);
    if (success) {
      redirect(303, `/room/${room.id}`);
    }
  },
};

export async function load({ parent }) {
  const data = await parent();
  if (data.me.room) {
    redirect(307, `/room/${data.me.room.id}`);
  }
  const rooms = getRooms();
  return { rooms };
}
