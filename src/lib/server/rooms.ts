import EventEmitter from "events";

export const roomEmitter = new EventEmitter<{
  "room-open": [string];
  "room-close": [string];
}>();

export const PLAYER_EXPIRATION_MS = 24 * 60 * 60 * 1000;

export interface PlayerData {
  name: string;
  uuid: string;
  isNew: boolean;
  room: RoomData | null;
  playerIndex: number;
  expiresAt: Date;
  isExpired: boolean;
}

class Player {
  #name: string;
  isNew: boolean;
  uuid: string;
  room: Room | null;
  playerIndex: number;
  expiresAt: Date;

  constructor(name: string) {
    this.#name = name;
    this.isNew = true;
    this.uuid = crypto.randomUUID();
    this.room = null;
    this.playerIndex = -1;
    const expireUtc = Date.now() + PLAYER_EXPIRATION_MS;
    this.expiresAt = new Date(expireUtc);
  }

  get name(): string {
    return this.#name;
  }

  set name(value: string) {
    this.#name = value;
    this.isNew = false;
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get data(): PlayerData {
    const { name, isNew, uuid, room, playerIndex, expiresAt, isExpired } = this;
    return {
      name,
      isNew,
      uuid,
      room: room?.data ?? null,
      playerIndex,
      expiresAt,
      isExpired,
    };
  }
}

export type PlayerCount = 2 | 3 | 4 | 5 | 6;

export function isValidPlayerCount(
  playerCount: number,
): playerCount is PlayerCount {
  return Number.isInteger(playerCount) && playerCount >= 2 && playerCount <= 6;
}

export type RoomState = "created" | "active" | "ended" | "abandoned";

export interface RoomData {
  id: string;
  playerCount: PlayerCount;
  players: string[];
  state: RoomState;
  isClosed: boolean;
}

class Room {
  id: string;
  playerCount: PlayerCount;
  players: Player[];
  state: RoomState;

  constructor(id: string, playerCount: PlayerCount) {
    this.id = id;
    this.playerCount = playerCount;
    this.players = [];
    this.state = "created";
  }

  get isClosed(): boolean {
    return this.state === "ended" || this.state === "abandoned";
  }

  get data(): RoomData {
    const { id, playerCount, players, state, isClosed } = this;
    return {
      id,
      playerCount,
      players: players.map((player) => player.uuid),
      state,
      isClosed,
    };
  }
}

let players: Player[] = [];
let rooms: Room[] = [];

function cleanupPlayers() {
  players = players.filter((player) => !player.isExpired);
}

function getPlayerInstance(uuid: string): Player | undefined {
  return players.find((player) => player.uuid === uuid);
}

export function getPlayer(uuid: string): PlayerData | null {
  const player = getPlayerInstance(uuid);
  return player?.data ?? null;
}

export function createPlayer(name: string): PlayerData {
  cleanupPlayers();
  const player = new Player(name);
  players.push(player);
  return player.data;
}

export function renamePlayer(uuid: string, name: string): PlayerData | null {
  const player = getPlayerInstance(uuid);
  if (!player) return null;
  player.name = name;
  return player.data;
}

function cleanupRooms() {
  rooms = rooms.filter((room) => {
    if (room.isClosed) {
      roomEmitter.emit("room-close", room.id);
      return false;
    } else {
      return true;
    }
  });
}

function getRoomInstance(id: string): Room | undefined {
  return rooms.find((room) => room.id === id);
}

export function getRoom(id: string): RoomData | null {
  const room = getRoomInstance(id);
  return room?.data ?? null;
}

export function getRooms(): string[] {
  cleanupRooms();
  return rooms.map((room) => room.id);
}

export function createRoom(
  id: string,
  playerCount: PlayerCount,
): RoomData | null {
  cleanupRooms();
  if (!id || getRoomInstance(id)) {
    return null;
  }
  const room = new Room(id, playerCount);
  rooms.push(room);
  roomEmitter.emit("room-open", id);
  return room.data;
}

export function getOrCreateRoom(
  id: string,
  playerCount: PlayerCount,
): RoomData | null {
  cleanupRooms();
  if (!id) return null;
  let room = getRoomInstance(id);
  if (!room) {
    room = new Room(id, playerCount);
    rooms.push(room);
    roomEmitter.emit("room-open", id);
  }
  return room.data;
}

export function joinRoom(playerUUID: string, roomID: string): boolean {
  // TODO limit player count.
  let player = getPlayerInstance(playerUUID);
  let room = getRoomInstance(roomID);
  if (!player || !room) {
    return false;
  }
  const idx = room.players.length;
  room.players.push(player);
  player.room = room;
  player.playerIndex = idx;
  return true;
}
