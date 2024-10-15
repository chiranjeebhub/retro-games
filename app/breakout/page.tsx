"use client";

import React, { useRef, useEffect, useState } from "react";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 8;
const BRICK_ROWS = 5;
const BRICK_COLUMNS = 8;
const BRICK_WIDTH = 80;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 10;

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface Ball extends GameObject {
  dx: number;
  dy: number;
  radius: number;
}

interface Brick extends GameObject {
  status: number;
}

export default function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const [paddle, setPaddle] = useState<GameObject>({
    x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    color: "#0095DD",
  });

  const [ball, setBall] = useState<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 30,
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
    color: "#0095DD",
    dx: 4,
    dy: -4,
    radius: BALL_RADIUS,
  });

  const [bricks, setBricks] = useState<Brick[]>(() => {
    const bricks: Brick[] = [];
    for (let c = 0; c < BRICK_COLUMNS; c++) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        bricks.push({
          x: c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_PADDING,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_PADDING + 30,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color: "#0095DD",
          status: 1,
        });
      }
    }
    return bricks;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw paddle
      ctx.fillStyle = paddle.color;
      ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.closePath();

      // Draw bricks
      bricks.forEach((brick) => {
        if (brick.status === 1) {
          ctx.fillStyle = brick.color;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        }
      });

      // Draw score
      ctx.fillStyle = "#0095DD";
      ctx.font = "16px Arial";
      ctx.fillText(`Score: ${score}`, 8, 20);

      if (gameOver) {
        ctx.fillStyle = "#FF0000";
        ctx.font = "32px Arial";
        ctx.fillText("Game Over", CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2);
      }

      if (gameWon) {
        ctx.fillStyle = "#00FF00";
        ctx.font = "32px Arial";
        ctx.fillText("You Win!", CANVAS_WIDTH / 2 - 50, CANVAS_HEIGHT / 2);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [paddle, ball, bricks, score, gameOver, gameWon]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (gameOver || gameWon) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const newPaddleX = mouseX - PADDLE_WIDTH / 2;

      setPaddle((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, newPaddleX)),
      }));
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gameOver, gameWon]);

  useEffect(() => {
    if (gameOver || gameWon) return;

    const gameLoop = setInterval(() => {
      setBall((prevBall) => {
        let newX = prevBall.x + prevBall.dx;
        let newY = prevBall.y + prevBall.dy;
        let newDx = prevBall.dx;
        let newDy = prevBall.dy;

        // Improved wall collision
        if (
          newX - prevBall.radius < 0 ||
          newX + prevBall.radius > CANVAS_WIDTH
        ) {
          newDx = -newDx;
          newX =
            newX - prevBall.radius < 0
              ? prevBall.radius
              : CANVAS_WIDTH - prevBall.radius;
        }
        if (newY - prevBall.radius < 0) {
          newDy = -newDy;
          newY = prevBall.radius;
        }

        // Improved paddle collision
        if (
          newY + prevBall.radius > paddle.y &&
          newY + prevBall.radius < paddle.y + paddle.height &&
          newX > paddle.x &&
          newX < paddle.x + paddle.width
        ) {
          newDy = -Math.abs(newDy); // Ensure the ball always bounces upward
          newY = paddle.y - prevBall.radius;

          // Add some randomness to the ball's direction
          newDx = newDx + (Math.random() - 0.5) * 2;
        }

        // Game over if ball touches bottom
        if (newY + prevBall.radius > CANVAS_HEIGHT) {
          setGameOver(true);
          clearInterval(gameLoop);
        }

        // Check brick collisions
        setBricks((prevBricks) => {
          let allBrokenBricks = true;
          const newBricks = prevBricks.map((brick) => {
            if (brick.status === 1) {
              allBrokenBricks = false;
              if (
                newX + prevBall.radius > brick.x &&
                newX - prevBall.radius < brick.x + brick.width &&
                newY + prevBall.radius > brick.y &&
                newY - prevBall.radius < brick.y + brick.height
              ) {
                // Determine which side of the brick was hit
                const overlapLeft = newX + prevBall.radius - brick.x;
                const overlapRight =
                  brick.x + brick.width - (newX - prevBall.radius);
                const overlapTop = newY + prevBall.radius - brick.y;
                const overlapBottom =
                  brick.y + brick.height - (newY - prevBall.radius);

                // Find the smallest overlap
                const minOverlap = Math.min(
                  overlapLeft,
                  overlapRight,
                  overlapTop,
                  overlapBottom
                );

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                  newDx = -newDx;
                } else {
                  newDy = -newDy;
                }

                setScore((prevScore) => prevScore + 1);
                return { ...brick, status: 0 };
              }
            }
            return brick;
          });

          if (allBrokenBricks) {
            setGameWon(true);
            clearInterval(gameLoop);
          }

          return newBricks;
        });

        return { ...prevBall, x: newX, y: newY, dx: newDx, dy: newDy };
      });
    }, 1000 / 60); // 60 FPS

    return () => {
      clearInterval(gameLoop);
    };
  }, [paddle, gameOver, gameWon]);

  const handleRestart = () => {
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    setPaddle({
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      color: "#0095DD",
    });
    setBall({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      width: BALL_RADIUS * 2,
      height: BALL_RADIUS * 2,
      color: "#0095DD",
      dx: 4,
      dy: -4,
      radius: BALL_RADIUS,
    });
    setBricks((prevBricks) =>
      prevBricks.map((brick) => ({ ...brick, status: 1 }))
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <h1 className="text-4xl font-bold mb-4 text-white">Breakout Game</h1>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-white cursor-none"
      />
      {(gameOver || gameWon) && (
        <button
          onClick={handleRestart}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Restart Game
        </button>
      )}
      <div className="mt-4 text-white">
        <p>Move your mouse left and right to control the paddle</p>
      </div>
    </div>
  );
}
