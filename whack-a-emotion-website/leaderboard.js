// Firebase config
/* Firebase-backed leaderboard retained for possible backend restoration:
// Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyABpmiXQPgaUUBEKz4Ywt409FGGGaO8tDM",
  authDomain: "whack-a-emotion--mectt.firebaseapp.com",
  databaseURL: "https://whack-a-emotion--mectt-default-rtdb.firebaseio.com",
  projectId: "whack-a-emotion--mectt",
  storageBucket: "whack-a-emotion--mectt.appspot.com",
  messagingSenderId: "922744927952",
  appId: "1:922744927952:web:e8ba8c05e32fc3e080d0d5"
});

const tableBody = document.getElementById("table-body");
const uniFilter = document.getElementById("filter-uni");
const sortFilter = document.getElementById("filter-sort");
const todayFilter = document.getElementById("filter-today");

let allData = [];

// Read scores
firebase.database().ref("scores").on("value", snap => {
  allData = [];
  snap.forEach(child => allData.push(child.val()));
  populateUniversities();
  render();
});

function populateUniversities() {
  const unis = [...new Set(allData.map(p => p.university))];
  uniFilter.innerHTML = `<option value="ALL">All Universities</option>`;
  unis.forEach(u => {
    uniFilter.innerHTML += `<option value="${u}">${u}</option>`;
  });
}

function render() {
  tableBody.innerHTML = "";

  let filtered = [...allData];

  if (uniFilter.value !== "ALL") {
    filtered = filtered.filter(p => p.university === uniFilter.value);
  }

  if (todayFilter.checked) {
    const today = new Date().setHours(0,0,0,0);
    filtered = filtered.filter(p => p.timestamp >= today);
  }

  if (sortFilter.value === "score") {
    filtered.sort((a,b) => b.score - a.score);
  } else {
    filtered.sort((a,b) => b.timestamp - a.timestamp);
  }

  filtered.forEach((p, i) => {
    const row = document.createElement("tr");

    row.className =
      p.result === "WIN" ? "win" :
      p.result === "LOSE" ? "lose" : "close";

    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.university}</td>
      <td>${p.score}</td>
      <td>${p.result}</td>
    `;

    tableBody.appendChild(row);
  });
}

uniFilter.onchange = render;
sortFilter.onchange = render;
todayFilter.onchange = render;

function goHome() {
  setState(STATES.IDLE);
}
*/

// Standalone demo mode: scores are stored in this browser after each game.
const LEADERBOARD_KEY = "LEADERBOARD_ENTRIES";
const tableBody = document.getElementById("table-body");
const uniFilter = document.getElementById("filter-uni");
const sortFilter = document.getElementById("filter-sort");
const todayFilter = document.getElementById("filter-today");

function readEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

function populateUniversities(entries) {
  const selectedUniversity = uniFilter.value;
  const universities = [...new Set(entries.map((entry) => entry.university).filter(Boolean))].sort();
  uniFilter.replaceChildren(new Option("All Universities", "ALL"));

  universities.forEach((university) => {
    uniFilter.add(new Option(university, university));
  });

  if ([...uniFilter.options].some((option) => option.value === selectedUniversity)) {
    uniFilter.value = selectedUniversity;
  }
}

function render() {
  const entries = readEntries();
  populateUniversities(entries);

  let visibleEntries = entries.filter((entry) =>
    uniFilter.value === "ALL" || entry.university === uniFilter.value
  );

  if (todayFilter.checked) {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    visibleEntries = visibleEntries.filter((entry) => entry.timestamp >= startOfToday);
  }

  visibleEntries.sort((first, second) => sortFilter.value === "score"
    ? second.score - first.score
    : second.timestamp - first.timestamp
  );

  tableBody.replaceChildren();
  if (visibleEntries.length === 0) {
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = "No games recorded yet.";
    return;
  }

  visibleEntries.forEach((entry, index) => {
    const row = tableBody.insertRow();
    row.className = entry.result === "WIN" ? "win" : "lose";
    [index + 1, entry.name || "Guest", entry.university || "-", entry.score, entry.result === "WIN" ? "Win" : "Loss"]
      .forEach((value) => {
        const cell = row.insertCell();
        cell.textContent = String(value);
      });
  });
}

uniFilter.addEventListener("change", render);
sortFilter.addEventListener("change", render);
todayFilter.addEventListener("change", render);

function goHome() {
  setState(STATES.IDLE);
}

render();
