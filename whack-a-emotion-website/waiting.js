/* ESP32 mode, disabled for standalone demo:
function pollESP() {
  setInterval(async () => {
    try {
      const res = await fetch("http://192.168.4.1/state");
      const espState = await res.text();

      if (espState === "PLAYING") {
        setState(STATES.PLAYING);
      }

    } catch (e) {
      console.log("ESP not reachable");
    }
     }, 1000);
}

pollESP();
*/

// Standalone demo mode: start gameplay locally after the ready-screen countdown.
setTimeout(() => setState(STATES.PLAYING), 2500);