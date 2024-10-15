"use client";

import React, { useRef, useEffect, useState } from "react";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface Player extends GameObject {
  speed: number;
}

interface Enemy extends GameObject {
  speed: number;
}

interface Bullet extends GameObject {
  speed: number;
}

export default function GalaxyShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [player, setPlayer] = useState<Player>({
    x: CANVAS_WIDTH / 2 - 25,
    y: CANVAS_HEIGHT - 50,
    width: 50,
    height: 30,
    color: "#00ff00",
    speed: 5,
  });

  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw player
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.width, player.height);

      // Draw enemies
      enemies.forEach((enemy) => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      });

      // Draw bullets
      bullets.forEach((bullet) => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      });

      // Draw score
      ctx.fillStyle = "#ffffff";
      ctx.font = "20px Arial";
      ctx.fillText(`Score: ${score}`, 10, 30);

      if (gameOver) {
        ctx.fillStyle = "#ff0000";
        ctx.font = "40px Arial";
        ctx.fillText("Game Over", CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [player, enemies, bullets, score, gameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (gameOver) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      setPlayer((prev) => ({
        ...prev,
        x: Math.max(
          0,
          Math.min(CANVAS_WIDTH - prev.width, mouseX - prev.width / 2)
        ),
      }));
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      // Move bullets
      setBullets((prev) =>
        prev
          .filter((bullet) => bullet.y > 0)
          .map((bullet) => ({ ...bullet, y: bullet.y - bullet.speed }))
      );

      // Move enemies
      setEnemies((prev) =>
        prev
          .filter((enemy) => enemy.y < CANVAS_HEIGHT)
          .map((enemy) => ({ ...enemy, y: enemy.y + enemy.speed }))
      );

      // Spawn new enemies
      if (Math.random() < 0.02) {
        setEnemies((prev) => [
          ...prev,
          {
            x: Math.random() * (CANVAS_WIDTH - 30),
            y: 0,
            width: 30,
            height: 30,
            color: "#ff0000",
            speed: 2,
          },
        ]);
      }

      // Automatic firing
      setBullets((prev) => [
        ...prev,
        {
          x: player.x + player.width / 2 - 2.5,
          y: player.y,
          width: 5,
          height: 10,
          color: "#ffff00",
          speed: 7,
        },
      ]);

      // Check collisions
      setBullets((prevBullets) => {
        setEnemies((prevEnemies) => {
          const newEnemies = [...prevEnemies];
          const newBullets = prevBullets.filter((bullet) => {
            let bulletHit = false;
            newEnemies.forEach((enemy, index) => {
              if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
              ) {
                newEnemies.splice(index, 1);
                bulletHit = true;
                setScore((prev) => prev + 10);
              }
            });
            return !bulletHit;
          });
          setEnemies(newEnemies);
          return newBullets;
        });
        return prevBullets;
      });

      // Check if player is hit
      setEnemies((prevEnemies) => {
        const playerHit = prevEnemies.some(
          (enemy) =>
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        );

        if (playerHit) {
          setGameOver(true);
          clearInterval(gameLoop);
        }

        return prevEnemies;
      });
    }, 1000 / 60); // 60 FPS

    return () => {
      clearInterval(gameLoop);
    };
  }, [player, gameOver]);

  const handleRestart = () => {
    setScore(0);
    setGameOver(false);
    setPlayer({
      x: CANVAS_WIDTH / 2 - 25,
      y: CANVAS_HEIGHT - 50,
      width: 50,
      height: 30,
      color: "#00ff00",
      speed: 5,
    });
    setEnemies([]);
    setBullets([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <h1 className="text-4xl font-bold mb-4 text-white">Galaxy Shooter</h1>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-white cursor-none"
      />
      {gameOver && (
        <button
          onClick={handleRestart}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Restart Game
        </button>
      )}
      <div className="mt-4 text-white">
        <p>Move your mouse to control the player ship</p>
      </div>
    </div>
  );
}
