import {
  createPlayer,
  getPlayer,
  PLAYER_EXPIRATION_MS,
  type PlayerData,
} from "$lib/server/rooms";

const PLAYER_COOKIE = "domdraft-me";

export function load({ cookies }) {
  let playerCookie = cookies.get(PLAYER_COOKIE);
  let me: PlayerData | null = null;
  if (playerCookie) {
    me = getPlayer(playerCookie);
  }
  if (!me) {
    me = createPlayer("");
    cookies.set(PLAYER_COOKIE, me.uuid, {
      path: "/",
      maxAge: PLAYER_EXPIRATION_MS / 1000,
    });
  }
  return { me };
}
