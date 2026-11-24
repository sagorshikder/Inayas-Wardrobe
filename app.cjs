// Universal cPanel Node.js (Phusion Passenger) startup file for Inaya's Wardrobe.
// Launches the pre-compiled production Express + MySQL server bundle on Node 18, 20, or 22.
import('./dist-server/server.mjs').catch((err) => {
  console.error("Failed to start Inaya's Wardrobe server:", err);
  process.exit(1);
});
