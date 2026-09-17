"use client";

import { useState } from "react";

export default function TestClient() {
  const [count, setCount] = useState(0);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "white",
        color: "black",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>REACT TEST</h1>

      <p>Contador: {count}</p>

      <button
        type="button"
        onClick={() => setCount(count + 1)}
        style={{
          marginTop: "30px",
          padding: "20px 30px",
          background: "black",
          color: "white",
          border: "0",
          fontWeight: "bold",
          fontSize: "16px",
        }}
      >
        SUMAR
      </button>
    </main>
  );
}