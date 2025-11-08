import Fastify from "fastify";
import cors from "@fastify/cors";
import wsPlugin from "@fastify/websocket";
import { WebSocket } from "ws";
import { makeStandard52, shuffledDeck, Session } from "./session.js";
import { CribbageRules } from "../../../packages/plugins/cribbage/src/cribbage_rules.js";

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: true }); // CORS for web app
await fastify.register(wsPlugin);

const PORT = Number(process.env.PORT ?? 8787);
const sessions = new Map<string, Session>();

function broadcast(sess: Session, msg: any) {
  for (const ws of sess.conns.values()) {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  }
}

fastify.post("/sessions", async (req, reply) => {
  const id = Math.random().toString(36).slice(2, 8);
  const seed = "abcd1234abcd1234abcd1234abcd1234"; // demo seed
  const deck = shuffledDeck(makeStandard52(), seed);
  const players = ["p1","p2"];
  const state = CribbageRules.setup(deck, players, {
    drbg: { nextBytes: (n: number) => new Uint8Array(n) },
    nowMs: () => Date.now(),
    scheduleTimer: () => {},
    log: () => {}
  });
  const sess: Session = { id, rules: CribbageRules, state, players, conns: new Map() };
  sessions.set(id, sess);
  return reply.send({ sessionId: id, fingerprint: seed.slice(0, 6) });
});

fastify.get("/ws", { websocket: true }, (conn, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId || !sessions.has(sessionId)) {
    conn.socket.close();
    return;
  }
  const sess = sessions.get(sessionId)!;
  // assign first free seat
  const pid = sess.players.find(p => !sess.conns.has(p)) ?? "spectator-" + Math.random().toString(36).slice(2,6);
  sess.conns.set(pid, conn.socket as unknown as WebSocket);

  const hello = { t: "WELCOME", sessionId, pid, public: sess.state.public };
  (conn.socket as any).send(JSON.stringify(hello));

  broadcast(sess, { t: "ANNOUNCE", text: `${pid} joined.` });

  conn.socket.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.t === "ACTION") {
        const action = msg.action as PlayerAction;
        const val = sess.rules.validateAction(sess.state, action, pid);
        if (!val.ok) {
          (conn.socket as any).send(JSON.stringify({ t: "REJECT", reason: val.reason }));
          return;
        }
        const res = sess.rules.handleAction(sess.state, action, pid, {
          drbg: { nextBytes: (n: number) => new Uint8Array(n) },
          nowMs: () => Date.now(),
          scheduleTimer: () => {},
          log: () => {}
        });
        if (res.kind === "REJECT") {
          (conn.socket as any).send(JSON.stringify({ t: "REJECT", reason: (res as any).reason }));
          return;
        }
        sess.state = res.newState;
        broadcast(sess, { t: "EVENTS", events: res.events, public: sess.state.public, turnPid: sess.state.turnPid });
      }
    } catch (e) {
      (conn.socket as any).send(JSON.stringify({ t: "ERROR", error: String(e) }));
    }
  });

  conn.socket.on("close", () => {
    sess.conns.delete(pid);
    broadcast(sess, { t: "ANNOUNCE", text: `${pid} left.` });
  });
});

fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log(`server up on :${PORT}`);
