"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 600;
const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

type Shape = number[][];
type Position = { x: number; y: number };

const SHAPES: Shape[] = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
];

const COLORS = [
  "#00FFFF", // Cyan
  "#FFFF00", // Yellow
  "#800080", // Purple
  "#0000FF", // Blue
  "#FF7F00", // Orange
  "#00FF00", // Green
  "#FF0000", // Red
];

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [board, setBoard] = useState<number[][]>(
    Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(0))
  );
  const [currentShape, setCurrentShape] = useState<Shape>([]);
  const [currentPosition, setCurrentPosition] = useState<Position>({
    x: 0,
    y: 0,
  });
  const [currentColor, setCurrentColor] = useState<string>("");

  const drawBoard = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      board.forEach((row, y) => {
        row.forEach((value, x) => {
          ctx.fillStyle = value ? COLORS[value - 1] : "#000";
          ctx.fillRect(
            x * BLOCK_SIZE,
            y * BLOCK_SIZE,
            BLOCK_SIZE - 1,
            BLOCK_SIZE - 1
          );
        });
      });
    },
    [board]
  );

  const drawShape = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = currentColor;
      currentShape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            ctx.fillRect(
              (currentPosition.x + x) * BLOCK_SIZE,
              (currentPosition.y + y) * BLOCK_SIZE,
              BLOCK_SIZE - 1,
              BLOCK_SIZE - 1
            );
          }
        });
      });
    },
    [currentShape, currentPosition, currentColor]
  );

  const createNewShape = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    const newShape = SHAPES[shapeIndex];
    setCurrentShape(newShape);
    setCurrentPosition({
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(newShape[0].length / 2),
      y: 0,
    });
    setCurrentColor(COLORS[shapeIndex]);
  }, []);

  const isValidMove = useCallback(
    (shape: Shape, position: Position) => {
      return shape.every((row, dy) =>
        row.every(
          (value, dx) =>
            value === 0 ||
            (position.x + dx >= 0 &&
              position.x + dx < BOARD_WIDTH &&
              position.y + dy < BOARD_HEIGHT &&
              (board[position.y + dy] === undefined ||
                board[position.y + dy][position.x + dx] === 0))
        )
      );
    },
    [board]
  );

  const rotate = useCallback(() => {
    const newShape = currentShape[0].map((_, index) =>
      currentShape.map((row) => row[index]).reverse()
    );
    if (isValidMove(newShape, currentPosition)) {
      setCurrentShape(newShape);
    }
  }, [currentShape, currentPosition, isValidMove]);

  const moveShape = useCallback(
    (dx: number, dy: number) => {
      const newPosition = {
        x: currentPosition.x + dx,
        y: currentPosition.y + dy,
      };
      if (isValidMove(currentShape, newPosition)) {
        setCurrentPosition(newPosition);
        return true;
      }
      return false;
    },
    [currentShape, currentPosition, isValidMove]
  );

  const mergeBoardAndShape = useCallback(() => {
    const newBoard = board.map((row) => [...row]);
    const colorIndex = COLORS.indexOf(currentColor) + 1;
    currentShape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          newBoard[currentPosition.y + y][currentPosition.x + x] = colorIndex;
        }
      });
    });
    setBoard(newBoard);
  }, [board, currentShape, currentPosition, currentColor]);

  const clearLines = useCallback(() => {
    let linesCleared = 0;
    const newBoard = board.filter((row) => {
      if (row.every((cell) => cell !== 0)) {
        linesCleared++;
        return false;
      }
      return true;
    });
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    setBoard(newBoard);
    setScore((prevScore) => prevScore + linesCleared * 100);
  }, [board]);

  const gameLoop = useCallback(() => {
    if (!moveShape(0, 1)) {
      mergeBoardAndShape();
      clearLines();
      createNewShape();
      if (!isValidMove(currentShape, currentPosition)) {
        setGameOver(true);
      }
    }
  }, [
    moveShape,
    mergeBoardAndShape,
    clearLines,
    createNewShape,
    isValidMove,
    currentShape,
    currentPosition,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawBoard(ctx);
      drawShape(ctx);

      if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "#FF0000";
        ctx.font = "32px Arial";
        ctx.fillText("Game Over", CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2);
      }
    };

    const gameInterval = setInterval(() => {
      if (!gameOver) {
        gameLoop();
      }
    }, 1000);

    const renderInterval = setInterval(render, 1000 / 60);

    return () => {
      clearInterval(gameInterval);
      clearInterval(renderInterval);
    };
  }, [drawBoard, drawShape, gameLoop, gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case "ArrowLeft":
          moveShape(-1, 0);
          break;
        case "ArrowRight":
          moveShape(1, 0);
          break;
        case "ArrowDown":
          moveShape(0, 1);
          break;
        case "ArrowUp":
          rotate();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveShape, rotate, gameOver]);

  useEffect(() => {
    createNewShape();
  }, [createNewShape]);

  const handleRestart = () => {
    setScore(0);
    setGameOver(false);
    setBoard(
      Array(BOARD_HEIGHT)
        .fill(null)
        .map(() => Array(BOARD_WIDTH).fill(0))
    );
    createNewShape();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <h1 className="text-4xl font-bold mb-4 text-white">Tetris</h1>
      <div className="flex items-start">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border border-white"
        />
        <div className="ml-4">
          <p className="text-2xl font-bold text-white">Score: {score}</p>
          <div className="mt-4 text-white">
            <p>Controls:</p>
            <p>← → : Move left/right</p>
            <p>↓ : Move down</p>
            <p>↑ : Rotate</p>
          </div>
        </div>
      </div>
      {gameOver && (
        <button
          onClick={handleRestart}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Restart Game
        </button>
      )}
    </div>
  );
}
