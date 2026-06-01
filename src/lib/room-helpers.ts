import { supabase } from "@/integrations/supabase/client";
import { getPlayerLimit } from "@/lib/games-data";
import type { Player } from "@/lib/game-logic";
import {
  generateRMCSInitialState,
  generateHousieBoard,
  generateUnoInitialState,
} from "@/lib/game-logic";

export type RoomRow = {
  id: string;
  code: string;
  game_id: string;
  host_id: string;
  status: "waiting" | "playing" | "finished";
  players: Player[];
  game_state: any;
  created_at: string;
  updated_at: string;
};

function makeCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRoom(gameId: string, me: Player): Promise<string> {
  const code = makeCode();
  const { error } = await supabase.from("rooms").insert({
    code,
    game_id: gameId,
    host_id: me.uid,
    status: "waiting",
    players: [me],
    game_state: null,
  });
  if (error) throw error;
  return code;
}

export async function joinRoomByCode(code: string, me: Player): Promise<RoomRow> {
  const upper = code.toUpperCase().trim();
  const { data: room, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", upper)
    .maybeSingle();
  if (error) throw error;
  if (!room) throw new Error("Room does not exist!");
  if (room.status !== "waiting") throw new Error("Game already started!");

  const players = (room.players as Player[]) || [];
  const limit = getPlayerLimit(room.game_id);
  if (players.find((p) => p.uid === me.uid)) return room as RoomRow;
  if (players.length >= limit) throw new Error("Room is full!");

  const newPlayers = [...players, me];
  const { error: upErr } = await supabase
    .from("rooms")
    .update({ players: newPlayers })
    .eq("id", room.id);
  if (upErr) throw upErr;
  return { ...(room as RoomRow), players: newPlayers };
}

export async function addBotToRoom(room: RoomRow): Promise<void> {
  const limit = getPlayerLimit(room.game_id);
  if (room.players.length >= limit) throw new Error("Player limit reached for this game!");
  const bot: Player = {
    uid: `bot_${Math.floor(Math.random() * 10000)}`,
    name: `Bot ${Math.floor(Math.random() * 100)}`,
    isBot: true,
  };
  const newPlayers = [...room.players, bot];
  const { error } = await supabase
    .from("rooms")
    .update({ players: newPlayers })
    .eq("id", room.id);
  if (error) throw error;
}

export async function startGame(room: RoomRow): Promise<void> {
  let initialGameState: any = {};
  if (room.game_id === "rmcs") {
    if (room.players.length < 4 || room.players.length > 6) {
      throw new Error("RMCS requires 4 to 6 players.");
    }
    initialGameState = generateRMCSInitialState(room.players);
  } else if (room.game_id === "snakes") {
    initialGameState = {
      positions: room.players.reduce((acc: Record<string, number>, p) => ({ ...acc, [p.uid]: 0 }), {}),
      turnIndex: 0,
      diceValue: null,
      winner: null,
      log: [],
    };
  } else if (room.game_id === "tictactoe") {
    if (room.players.length !== 2) {
      throw new Error("Tic Tac Toe requires exactly 2 players (You + Friend or Bot).");
    }
    initialGameState = {
      board: Array(9).fill(null),
      turnUid: room.players[0].uid,
      players: {
        [room.players[0].uid]: "X",
        [room.players[1].uid]: "O",
      },
      winner: null,
      winningLine: null,
      isDraw: false,
    };
  } else if (room.game_id === "housie") {
    const boards: Record<string, (number | "FREE")[]> = {};
    const marked: Record<string, (number | "FREE")[]> = {};
    room.players.forEach((p) => {
      boards[p.uid] = generateHousieBoard();
      marked[p.uid] = ["FREE"];
    });
    initialGameState = {
      boards,
      marked,
      calledNumbers: [],
      winner: null,
      lastCalled: null,
    };
  } else if (room.game_id === "uno") {
    if (room.players.length < 2) {
      throw new Error("Desi UNO requires at least 2 players.");
    }
    initialGameState = generateUnoInitialState(room.players);
  }

  const { error } = await supabase
    .from("rooms")
    .update({ status: "playing", game_state: initialGameState })
    .eq("id", room.id);
  if (error) throw error;
}

export async function patchGameState(roomId: string, current: any, patch: any) {
  const next = { ...current, ...patch };
  const { error } = await supabase.from("rooms").update({ game_state: next }).eq("id", roomId);
  if (error) throw error;
}

export async function replaceGameState(roomId: string, next: any) {
  const { error } = await supabase.from("rooms").update({ game_state: next }).eq("id", roomId);
  if (error) throw error;
}