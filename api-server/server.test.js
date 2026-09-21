const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { startServer } = require("./server");

test("returns a 400 response for malformed JSON payloads", async () => {
  const server = await startServer(0, { initializeDb: false });

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const payload = '{"email": "user@example.com",';

    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/login",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            resolve({ statusCode: res.statusCode, body });
          });
        },
      );

      req.on("error", reject);
      req.write(payload);
      req.end();
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.body, /Invalid JSON/i);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("allows Codespaces dashboard origins to preflight API requests", async () => {
  const server = await startServer(0, { initializeDb: false });

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/recommendations",
          method: "OPTIONS",
          headers: {
            Origin: "https://example-5173.app.github.dev",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res));
        },
      );

      req.on("error", reject);
      req.end();
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "https://example-5173.app.github.dev",
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
