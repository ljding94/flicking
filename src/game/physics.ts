import Matter from "matter-js";
import { TUNING } from "./tuning";
import type { Match, Piece } from "./types";

const { Engine, World, Bodies, Body, Events } = Matter;

export interface PhysicsWorld {
  engine: Matter.Engine;
  bodies: Map<string, Matter.Body>;
  obstacleBodies: Matter.Body[];
}

export function createPhysics(match: Match): PhysicsWorld {
  const engine = Engine.create({
    gravity: { x: 0, y: 0, scale: 0 },
  });
  // More solver passes so heavy→light momentum transfer resolves cleanly
  engine.positionIterations = 12;
  engine.velocityIterations = 10;

  const bodies = new Map<string, Matter.Body>();
  for (const piece of match.pieces) {
    if (!piece.alive) continue;
    const body = makePieceBody(piece);
    bodies.set(piece.id, body);
    World.add(engine.world, body);
  }

  const obstacleBodies = match.obstacles.map((o) => {
    const body = Bodies.circle(o.x, o.y, o.radius, {
      isStatic: true,
      restitution: TUNING.obstacleRestitution,
      friction: 0,
      frictionAir: 0,
      label: o.id,
    });
    World.add(engine.world, body);
    return body;
  });

  Events.on(engine, "beforeUpdate", () => {
    for (const body of bodies.values()) {
      // Pucks: no spin — keeps collisions mass-driven instead of torque sinks
      Body.setAngularVelocity(body, 0);
      if (body.speed > 0 && body.speed < TUNING.sleepSpeed * 0.5) {
        Body.setVelocity(body, { x: 0, y: 0 });
      }
    }
  });

  return { engine, bodies, obstacleBodies };
}

function makePieceBody(piece: Piece): Matter.Body {
  const body = Bodies.circle(piece.x, piece.y, piece.radius, {
    restitution: TUNING.restitution,
    friction: 0,
    frictionAir: TUNING.friction,
    frictionStatic: 0,
    label: piece.id,
    slop: 0.01,
  });

  // Density≈area made every tier feel the same. Force designed mass instead.
  Body.setMass(body, piece.mass);
  Body.setInertia(body, Infinity);

  return body;
}

export function syncBodiesFromMatch(world: PhysicsWorld, match: Match): void {
  for (const piece of match.pieces) {
    const body = world.bodies.get(piece.id);
    if (!body) continue;
    if (!piece.alive) {
      World.remove(world.engine.world, body);
      world.bodies.delete(piece.id);
      continue;
    }
    Body.setPosition(body, { x: piece.x, y: piece.y });
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
  }
}

export function writePositionsToMatch(world: PhysicsWorld, match: Match): void {
  for (const piece of match.pieces) {
    if (!piece.alive) continue;
    const body = world.bodies.get(piece.id);
    if (!body) continue;
    piece.x = body.position.x;
    piece.y = body.position.y;
  }
}

export function removeDeadBodies(world: PhysicsWorld, match: Match): void {
  for (const piece of match.pieces) {
    if (piece.alive) continue;
    const body = world.bodies.get(piece.id);
    if (!body) continue;
    World.remove(world.engine.world, body);
    world.bodies.delete(piece.id);
  }
}

export function applyFlick(
  world: PhysicsWorld,
  pieceId: string,
  vx: number,
  vy: number,
): void {
  const body = world.bodies.get(pieceId);
  if (!body) return;
  // Same pull → same launch speed; heavier mass then carries more momentum
  Body.setVelocity(body, { x: vx, y: vy });
  Body.setAngularVelocity(body, 0);
}

export function stepPhysics(world: PhysicsWorld, dtMs: number): void {
  // Fixed 60Hz steps — avoids Matter delta warnings and keeps frictionAir consistent
  const step = 1000 / 60;
  let remain = Math.min(dtMs, 50);
  while (remain > 0) {
    Engine.update(world.engine, step);
    remain -= step;
  }
}

export function allSleeping(world: PhysicsWorld): boolean {
  for (const body of world.bodies.values()) {
    if (body.speed > TUNING.sleepSpeed) return false;
  }
  return true;
}

export function destroyPhysics(world: PhysicsWorld): void {
  World.clear(world.engine.world, false);
  Engine.clear(world.engine);
  world.bodies.clear();
}
