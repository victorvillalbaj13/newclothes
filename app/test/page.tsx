export default function TestPage() {
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
      <h1>EXTERNAL JS TEST</h1>

      <script src="/test.js"></script>
    </main>
  );
}