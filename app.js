function fmt(dt) {
  if (!dt) return "Undated";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "Undated";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function uniq(arr) {
  return [...new Set(arr)].sort((a, b) => a.localeCompare(b));
}

async function load() {
  const res = await fetch("./data.json", { cache: "no-store" });
  const data = await res.json();

  const meta = document.getElementById("meta");
  meta.textContent = `Updated ${fmt(data.generatedAt)} · ${data.itemCount} items`;

  const sources = uniq((data.items || []).map((i) => i.source).filter(Boolean));
  const sel = document.getElementById("sourceFilter");
  for (const s of sources) {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    sel.appendChild(o);
  }

  const q = document.getElementById("q");
  const list = document.getElementById("list");

  function render() {
    const term = (q.value || "").trim().toLowerCase();
    const source = sel.value || "";

    const items = (data.items || []).filter((i) => {
      if (source && i.source !== source) return false;
      if (term && !String(i.title || "").toLowerCase().includes(term)) return false;
      return true;
    });

    list.innerHTML = "";
    for (const it of items) {
      const card = document.createElement("div");
      card.className = "card";

      const top = document.createElement("div");
      top.className = "row";

      const left = document.createElement("span");
      left.className = "badge";
      left.textContent = it.source || "Source";

      const right = document.createElement("span");
      right.className = "muted";
      right.textContent = fmt(it.published);

      top.appendChild(left);
      top.appendChild(right);

      const a = document.createElement("a");
      a.href = it.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";

      const t = document.createElement("div");
      t.className = "title";
      t.textContent = it.title || "(Untitled)";

      a.appendChild(t);

      card.appendChild(top);
      card.appendChild(a);

      list.appendChild(card);
    }
  }

  q.addEventListener("input", render);
  sel.addEventListener("change", render);
  render();

  if (data.errors && data.errors.length) {
    console.warn("Feed errors:", data.errors);
  }
}

load().catch((e) => {
  console.error(e);
  const meta = document.getElementById("meta");
  if (meta) meta.textContent = "Failed to load data.";
});
